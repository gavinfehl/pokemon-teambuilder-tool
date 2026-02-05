import Cytoscape, { ElementsDefinition, ElementDefinition, LayoutOptions, NodeSingular, Core } from 'cytoscape';

interface FcoseLayoutOptions {
  name: 'fcose';
  nodeRepulsion?: number | ((node: any) => number);
  idealEdgeLength?: number | ((edge: any) => number);
  edgeElasticity?: number | ((edge: any) => number);
  nestingFactor?: number;
  gravity?: number;
  numIter?: number;
  tile?: boolean;
  random?: boolean;
  randomize?: boolean;
  animate?: boolean | 'end' | 'during';
  animationDuration?: number;
  animationEasing?: any;
  tilingPaddingVertical?: number;
  tilingPaddingHorizontal?: number;
  gravityRangeCompound?: number;
  gravityCompound?: number;
  gravityRange?: number;
  initialEnergyOnIncremental?: number;
  fit?: boolean;
  padding?: number;
  boundingBox?: { x1: number; y1: number; w: number; h: number };
  nodeSeparation?: number;
  nodeOverlap?: number;
  quality?: 'default' | 'proof';
  nodeDimensionsIncludeLabels?: boolean;
  uniformNodeDimensions?: boolean;
}

// Function to setup hover behavior for fcose layout
export function setupFcoseHoverBehavior(cy: Core) {
  // Hide all edges initially
  cy.edges().style('opacity', 0);
  
  // Add hover listeners to nodes
  cy.nodes().on('mouseover', function(event) {
    const node = event.target;
    
    // Show outgoing edges from this node
    node.connectedEdges().forEach((edge: any) => {
      if (edge.source().id() === node.id()) {
        edge.style('opacity', 1);
        // Optionally highlight the target node
        edge.target().style('opacity', 1);
      }
    });
  });
  
  cy.nodes().on('mouseout', function(event) {
    const node = event.target;
    
    // Hide outgoing edges from this node
    node.connectedEdges().forEach((edge: any) => {
      if (edge.source().id() === node.id()) {
        edge.style('opacity', 0);
        // Reset target node opacity if not being hovered
        // Check if target is not currently hovered
        if (!edge.target().same(cy.$(':selected')) && !edge.target().hasClass('hover')) {
          edge.target().style('opacity', 1); // Keep nodes visible
        }
      }
    });
  });
}

// Modified fcose layout with ready callback - SPREAD OUT VERSION
export const fcoseLayout: FcoseLayoutOptions & { ready?: (event: any) => void } = {
  name: 'fcose',
  // Quality settings for collision detection
  quality: 'proof',
  nodeDimensionsIncludeLabels: false,
  uniformNodeDimensions: false,
  
  // Prevent overlapping - INCREASED for more spread
  nodeRepulsion: 4500,  // Increased from 5
  nodeOverlap: 20,      // Decreased from 1000
  
  // Edge behavior - LONGER EDGES
  idealEdgeLength: (edge) => {
    const weight = edge.data('weight');
    return 8000 / (weight + 5);  // Increased from 2800
  },
  edgeElasticity: (edge) => {
    const weight = edge.data('weight');
    return 0.3 + (weight / 100) * 0.5;
  },
  
  // Physics - REDUCED GRAVITY
  nestingFactor: 0.1,
  gravity: 0.05,        // Reduced from 0.1 to allow more spread
  numIter: 150000,
  tile: false,
  
  // Animation
  animate: 'end',
  animationDuration: 4000,
  animationEasing: undefined,
  
  fit: true,
  padding: 50,
  randomize: true,
  
  // Incremental layout
  initialEnergyOnIncremental: 0.3,
  
  // Bounding box - LARGER for more spread
  boundingBox: { x1: 0, y1: 0, w: 8000, h: 8000 },  // Increased from 3500
  
  // Compound node settings
  gravityRangeCompound: 1.5,
  gravityCompound: 1.0,
  gravityRange: 4.0,
};

// Grid layout - EXACT match to original
export const gridLayout: any = {
  name: "grid",
  fit: true,
  animate: false,
  animationDuration: 500,
  padding: 10,
  avoidOverlap: true,
  avoidOverlapPadding: 10,
  condense: false,
  rows: undefined,
};

// Circle layout for teammate focus - EXACT match to original
export const circleLayout: any = {
  name: 'circle',
  fit: true,
  animate: true,
  animationDuration: 1000,
  avoidOverlap: false,
  nodeSpacing: 1000,
  boundingBox: { x1: 0, y1: 0, w: 2500, h: 2500 },
  startAngle: 3*Math.PI / 2,
  clockwise: true,
  sort: function(a: NodeSingular, b: NodeSingular) {
    return a.data('size') - b.data('size');
  },
};

// Concentric circle layout - EXACT match to original
export const concentricLayout: any = {
  name: 'circle',
  fit: true,
  animate: false,
  animationDuration: 1000,
  avoidOverlap: false,
  nodeSpacing: 1000,
  boundingBox: { x1: 0, y1: 0, w: 2500, h: 2500 },
  startAngle: Math.PI / 2,
  clockwise: true,
  sort: function(a: NodeSingular, b: NodeSingular){
    const sizeA = parseFloat(a.data('size')) || 0;
    const sizeB = parseFloat(b.data('size')) || 0;
    const cmpResult = (sizeA - sizeB);
    return cmpResult;
  },
};

export const focusLayout: any = {
  name: 'circle',
  fit: true,
  animate: true,
  animationDuration: 1000,
  padding: 50,
  startAngle: 3*Math.PI / 2,
  clockwise: true,
  sort: function(a: NodeSingular, b: NodeSingular){
    return a.data('size') - b.data('size');
  },
};

export default {
  fcose: fcoseLayout,
  grid: gridLayout,
  circle: circleLayout,
  concentric: concentricLayout,
  focus: focusLayout,
  setupFcoseHoverBehavior, // Export the helper function
};