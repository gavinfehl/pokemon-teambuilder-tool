// improvedLayouts.ts - Matches original testgraphlayouts.tsx
import Cytoscape, { ElementsDefinition, ElementDefinition, LayoutOptions, NodeSingular } from 'cytoscape';

interface FcoseLayoutOptions {
    name: 'fcose';
    nodeRepulsion?: number;
    fit: boolean;
    idealEdgeLength?: number | ((edge: Cytoscape.EdgeSingular) => number)
    edgeElasticity?: number;
    nestingFactor?: number;
    gravity?: number;
    numIter?: number;
    tile?: boolean;
    random?: boolean;
    animate?: 'during' | 'end' | false;
    animationDuration?: number;
    tilingPaddingVertical?: number;
    tilingPaddingHorizontal?: number;
    gravityRangeCompound?: number;
    gravityCompound?: number;
    gravityRange?: number;
    initialEnergyOnIncremental?: number;
    boundingBox: { x1: number, y1: number, w: number, h: number };
}

// teammatesFcose layout - EXACT match to original
export const fcoseLayout: FcoseLayoutOptions = {
    name: 'fcose',
    nodeRepulsion: 70000,
    idealEdgeLength: (edge) => {
        let idealLength = 3/(edge.data('weight')+1);
        return idealLength;
    },
    fit: true,
    edgeElasticity: 0.45,
    nestingFactor: 0.1,
    gravity: 0.05,
    numIter: 25000,
    tile: false,
    random: true,
    animate: 'end',
    animationDuration: 4000,
    tilingPaddingVertical: 10,
    tilingPaddingHorizontal: 10,
    gravityRangeCompound: 1.5,
    gravityCompound: 1.0,
    gravityRange: 3.8,
    initialEnergyOnIncremental: 0.5,
    boundingBox: { x1: 0, y1: 0, w: 2500, h: 2500 },
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
        console.log(`Comparing ${a.data('label')}(${sizeA}) vs ${b.data('label')}(${sizeB}) = ${cmpResult}`);
        return cmpResult;
    },
};

export default {
    fcose: fcoseLayout,
    grid: gridLayout,
    circle: circleLayout,
    concentric: concentricLayout
};