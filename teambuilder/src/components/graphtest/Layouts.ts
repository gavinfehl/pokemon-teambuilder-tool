import { NodeSingular } from 'cytoscape';

export const fcoseLayout: any = {
  name: 'fcose',
  quality: 'proof',
  nodeDimensionsIncludeLabels: false,
  uniformNodeDimensions: false,
  nodeRepulsion: 45000,
  nodeOverlap: 8192,   // hard collision — no overlap tolerated
  // lift > 1 = genuine synergy → shorter ideal length (nodes drawn together)
  // lift ≈ 1 = random co-occurrence → longer length (nodes pushed apart)
  idealEdgeLength: (edge: any) => 600 / Math.max(edge.data('lift') ?? 1, 0.1),
  edgeElasticity:  (edge: any) => Math.min(0.1 + (edge.data('lift') ?? 1) * 0.35, 0.95),
  nestingFactor: 0.1,
  gravity: 0.08,
  numIter: 6000,       // more iterations to fully resolve overlap
  tile: false,
  animate: 'end',
  animationDuration: 2000,
  fit: true,
  padding: 50,
  randomize: true,
  initialEnergyOnIncremental: 0.3,
  boundingBox: { x1: 0, y1: 0, w: 6000, h: 6000 },
  gravityRangeCompound: 1.5,
  gravityCompound: 1.0,
  gravityRange: 4.0,
};

export const gridLayout: any = {
  name: 'grid',
  fit: false,
  animate: false,
  padding: 10,
  avoidOverlap: true,
  avoidOverlapPadding: 10,
  condense: false,
};

// List layout reuses grid positioning; the React overlay handles rendering
export const listLayout: any = {
  name: 'grid',
  fit: false,
  animate: false,
  padding: 10,
  avoidOverlap: true,
  avoidOverlapPadding: 10,
  condense: false,
};

export const circleLayout: any = {
  name: 'circle',
  fit: true,
  animate: true,
  animationDuration: 800,
  avoidOverlap: false,
  boundingBox: { x1: 0, y1: 0, w: 3000, h: 3000 },
  startAngle: 3 * Math.PI / 2,
  clockwise: true,
  sort: (a: NodeSingular, b: NodeSingular) => a.data('size') - b.data('size'),
};

export const concentricLayout: any = {
  name: 'concentric',
  fit: true,
  animate: true,
  animationDuration: 800,
  padding: 30,
  concentric: (node: NodeSingular) => node.data('size'),
  levelWidth: () => 3,
  clockwise: true,
};

export const focusLayout: any = {
  name: 'circle',
  fit: true,
  animate: true,
  animationDuration: 600,
  padding: 60,
  startAngle: 3 * Math.PI / 2,
  clockwise: true,
};

export default {
  fcose: fcoseLayout,
  grid: gridLayout,
  list: listLayout,
  circle: circleLayout,
  concentric: concentricLayout,
  focus: focusLayout,
};
