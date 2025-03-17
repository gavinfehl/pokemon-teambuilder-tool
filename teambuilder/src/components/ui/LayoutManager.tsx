// LayoutManager.tsx
import Cytoscape, { Core, NodeSingular, EdgeSingular } from 'cytoscape';

interface Layout {
  name: string;
  options: any; // Use 'any' to bypass strict typing issues
  transform?: (cy: Core, selectedNode?: NodeSingular | null) => void;
  description?: string;
  icon?: string;
}

class LayoutManager {
  cy: Core;
  layouts: Record<string, Layout>;
  currentLayout: string | null;
  layoutHistory: string[];
  selectedNode: NodeSingular | null;

  constructor(cy: Core) {
    this.cy = cy;
    this.layouts = {};
    this.currentLayout = null;
    this.layoutHistory = [];
    this.selectedNode = null;
  }

  // Register a new layout
  registerLayout(
    name: string, 
    options: any, // Use 'any' to bypass strict typing issues
    transform?: (cy: Core, selectedNode?: NodeSingular | null) => void,
    description?: string,
    icon?: string
  ) {
    this.layouts[name] = {
      name,
      options,
      transform,
      description,
      icon
    };
    return this;
  }

  // Get all registered layouts
  getLayouts() {
    return Object.values(this.layouts);
  }

  // Apply a layout by name
  applyLayout(name: string, selectedNode: NodeSingular | null = null) {
    if (!this.layouts[name]) {
      console.error(`Layout "${name}" not found`);
      return false;
    }
    
    // Store current layout in history if it's changing
    if (this.currentLayout && this.currentLayout !== name) {
      this.layoutHistory.push(this.currentLayout);
    }
    
    const layout = this.layouts[name];
    this.currentLayout = name;
    this.selectedNode = selectedNode;
    
    // If there's a transform function, apply it first
    if (layout.transform && typeof layout.transform === 'function') {
      layout.transform(this.cy, selectedNode);
    }
    
    // Run the layout
    const layoutInstance = this.cy.layout(layout.options);
    layoutInstance.run();
    
    // Center and fit the view after layout is complete
    // Check if animation is enabled before setting timeout
    const hasAnimation = layout.options.animate && 
      (layout.options.animate === true || layout.options.animate === 'end' || layout.options.animate === 'during');
    
    if (hasAnimation) {
      setTimeout(() => {
        this.cy.fit(this.cy.elements(':visible'), 50);
      }, 500);
    } else {
      this.cy.fit(this.cy.elements(':visible'), 50);
    }
    
    return true;
  }

  // Go back to previous layout
  previousLayout() {
    if (this.layoutHistory.length > 0) {
      const prevLayout = this.layoutHistory.pop() as string;
      this.applyLayout(prevLayout);
      return true;
    }
    return false;
  }

  // Reset the graph to its original state
  reset() {
    this.cy.elements().removeClass('hidden centered tile');
    this.layoutHistory = [];
    
    if (this.layouts['fcose']) {
      this.applyLayout('fcose');
    }
  }

  // Helper method to show only the selected node and its direct connections
  focusOnNode(node: NodeSingular) {
    // Save current state if needed
    if (this.currentLayout !== 'focus') {
      this.layoutHistory.push(this.currentLayout as string);
    }
    
    this.selectedNode = node;
    
    // Hide all nodes except the selected one and its connected nodes
    const connectedNodes = node.outgoers('edge').targets();
    this.cy.nodes().addClass('hidden').removeClass('centered tile');
    node.removeClass('hidden').addClass('centered');
    connectedNodes.removeClass('hidden');
    
    // Hide all edges except those connected to the selected node
    this.cy.edges().addClass('hidden');
    node.outgoers('edge').removeClass('hidden');
    
    // Position the focused node in the center
    const layoutInstance = this.cy.layout({
      name: 'concentric',
      concentric: (ele) => ele.same(node) ? 2 : 1,
      levelWidth: () => 1,
      animate: true,
      animationDuration: 500,
      fit: true,
    });
    
    layoutInstance.run();
    
    this.currentLayout = 'focus';
    return true;
  }
}

export default LayoutManager;