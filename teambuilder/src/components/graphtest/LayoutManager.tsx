// LayoutManager.tsx with improved focus centering
import Cytoscape, { Core, NodeSingular, EdgeSingular } from 'cytoscape';

interface Layout {
  name: string;
  options: any;
  transform?: (cy: Core, selectedNode?: NodeSingular | null) => void;
  description?: string;
}

class LayoutManager {
  cy: Core;
  layouts: Record<string, Layout>;
  currentLayout: string | null;
  layoutHistory: string[];
  selectedNode: NodeSingular | null;
  _fitTimeout: NodeJS.Timeout | null = null;

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
    options: any,
    transform?: (cy: Core, selectedNode?: NodeSingular | null) => void,
    description?: string,
  ) {
    this.layouts[name] = {
      name,
      options,
      transform,
      description,
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
    // Use smoother animation
    const hasAnimation = layout.options.animate && 
      (layout.options.animate === true || layout.options.animate === 'end' || layout.options.animate === 'during');
      
    if (this._fitTimeout) clearTimeout(this._fitTimeout);
    this._fitTimeout = setTimeout(() => {
      this.cy.animate({
        fit: {
          eles: this.cy.elements(':visible'),
          padding: 50
        },
        duration: 500,
        easing: 'ease-out-cubic'
      });
    }, hasAnimation ? 500 : 50);
    
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
    
    // Reset to grid layout
    if (this.layouts['grid']) {
      this.applyLayout('grid');
    } else if (this.layouts['fcose']) {
      this.applyLayout('fcose');
    }
  }

  // Improved focusOnNode method with better centering
  focusOnNode(node: NodeSingular) {
    // If already centered on this node, go back to grid
    if (this.currentLayout === 'focus' && 
        this.selectedNode && 
        this.selectedNode.same(node) && 
        node.hasClass('centered')) {
      // Return to grid view
      this.applyLayout('grid');
      return true;
    }
    
    // Save current state if needed - important for history
    if (this.currentLayout !== 'focus') {
      this.layoutHistory.push(this.currentLayout as string);
    }
    
    this.selectedNode = node;
    
    // CRITICAL FIX: First reset ALL classes on ALL elements
    // This ensures clean transition between different focus views
    this.cy.elements().removeClass('hidden centered tile');
    
    // Get direct connections
    const outgoingEdges = node.outgoers('edge');
    const connectedNodes = outgoingEdges.targets();
    
    // Hide all nodes that are not part of the focus
    this.cy.nodes().not(node).not(connectedNodes).addClass('hidden');
    this.cy.edges().not(outgoingEdges).addClass('hidden');
    
    // Add centered class to the selected node
    node.addClass('centered');
    
    // Calculate the ideal center position
    const centerX = this.cy.width() / 2;
    const centerY = this.cy.height() / 2;
    
    // Immediately position center node before layout starts
    node.position({ x: centerX, y: centerY });
    
    // Apply a circle layout to the connected nodes
    if (connectedNodes.length > 0) {
      // Use circle layout for connected nodes with explicit radius
      const layout = connectedNodes.layout({
        name: 'circle',
        fit: false,
        animate: true, 
        animationDuration: 300,
        radius: 250,
        startAngle: 3 * Math.PI / 2,
        clockwise: true
      });
      
      // Run the layout
      layout.run();
      
      // After the layout runs, ensure center node stays centered
      setTimeout(() => {
        // Ensure the central node is exactly in the center of the viewport
        const vpCenter = { 
          x: this.cy.width() / 2, 
          y: this.cy.height() / 2 
        };
        
        // Position the central node precisely in the center
        node.position(vpCenter);
        
        // Ensure the viewport is properly centered
        this.cy.center(node);
        
        // Get the current positions of connected nodes
        const positions: { [id: string]: { x: number, y: number } } = {};
        connectedNodes.forEach(n => {
          positions[n.id()] = n.position();
        });
        
        // Calculate how to shift all nodes to be centered around the central node
        let avgX = 0, avgY = 0;
        connectedNodes.forEach(n => {
          avgX += positions[n.id()].x;
          avgY += positions[n.id()].y;
        });
        avgX /= connectedNodes.length;
        avgY /= connectedNodes.length;
        
        // Shift all connected nodes to center around the main node
        const shiftX = vpCenter.x - avgX;
        const shiftY = vpCenter.y - avgY;
        
        connectedNodes.forEach(n => {
          const pos = positions[n.id()];
          n.position({
            x: pos.x + shiftX,
            y: pos.y + shiftY
          });
        });
      }, 50);
      
      // Fit view after a delay with better animation
      if (this._fitTimeout) clearTimeout(this._fitTimeout);
      this._fitTimeout = setTimeout(() => {
        // Center on the node first
        this.cy.center(node);
        
        // Then fit with animation
        this.cy.animate({
          fit: {
            eles: this.cy.elements(':visible'),
            padding: 30
          },
          duration: 300,
          easing: 'ease-out-cubic'
        });
      }, 100);
    } else {
      // If no connected nodes, just center on the node
      this.cy.center(node);
      this.cy.fit(this.cy.elements(':visible'), 30);
    }
    
    // Update current layout state
    this.currentLayout = 'focus';
    
    return true;
  }
}

export default LayoutManager;