import Cytoscape, { ElementsDefinition, ElementDefinition, LayoutOptions } from 'cytoscape';


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
const teammatesFcose: FcoseLayoutOptions = {
    name: 'fcose',
    nodeRepulsion: 70000,
    idealEdgeLength: (edge) => {
        let idealLength = 3/(edge.data('weight')+1);
        //console.log(idealLength);
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


interface gridLayoutOptions {
    name: "grid",
    fit: boolean, // Whether to fit the viewport to the graph
    animate: boolean,
    animationDuration: number,
    padding: number, // Padding around the layout
    avoidOverlap: boolean, // Prevent nodes from overlapping
    avoidOverlapPadding: number, // Extra spacing between overlapping nodes
    condense: boolean, // Whether to condense the layout
    rows: undefined, // Number of rows (automatically determined if undefined)
    //boundingBox: { x1: number, y1: number, w: number, h: number },
};

const tierGrid: gridLayoutOptions = {
    name: "grid",
    fit: true, // Whether to fit the viewport to the graph
    animate: false,
    animationDuration: 500,
    padding: 10, // Padding around the layout
    avoidOverlap: true, // Prevent nodes from overlapping
    avoidOverlapPadding: 10, // Extra spacing between overlapping nodes
    condense: false, // Whether to condense the layout
    rows: undefined, // Number of rows (automatically determined if undefined)
    //boundingBox: { x1: 0, y1: 0, w: 2500, h: 2500 },
};


interface circleLayoutOptions {
    name: 'circle',
    fit: boolean,
    animate: boolean,
    animationDuration: number,
    avoidOverlap: boolean,
    nodeSpacing: number,
    boundingBox: { x1: number, y1: number, w: number, h: number },
    startAngle: number,
    clockwise: boolean,
    sort: (a: Cytoscape.NodeSingular, b: Cytoscape.NodeSingular) => number,
}
const commonTeammates: circleLayoutOptions = {
    name: 'circle',
    fit: true,
    animate: true,
    animationDuration: 1000,
    avoidOverlap: false,
    nodeSpacing: 1000,
    boundingBox: { x1: 0, y1: 0, w: 2500, h: 2500 },
    startAngle: 3*Math.PI / 2,
    clockwise: true,
    sort: function(a, b){ 
        return a.data('size') - b.data('size');
    }, 
};
interface concentricCircleLayoutOptions {
    name: 'circle',
    fit: boolean,
    animate: boolean,
    animationDuration: number,
    avoidOverlap: boolean,
    nodeSpacing: number,
    boundingBox: { x1: number, y1: number, w: number, h: number },
    startAngle: number,
    clockwise: boolean,
    sort: (a: Cytoscape.NodeSingular, b: Cytoscape.NodeSingular) => number,
}
const cclayoutOptions: concentricCircleLayoutOptions = {
    name: 'circle',
    fit: true,
    animate: false,
    animationDuration: 1000,
    avoidOverlap: false,
    nodeSpacing: 1000,
    boundingBox: { x1: 0, y1: 0, w: 2500, h: 2500 },
    startAngle: Math.PI / 2,
    clockwise: true,
    sort: function(a, b){ 
        const sizeA = parseFloat(a.data('size')) || 0; // Ensure it's a number
        const sizeB = parseFloat(b.data('size')) || 0;
        const cmpResult = (sizeA - sizeB);
        console.log(`Comparing ${a.data('label')}(${sizeA}) vs ${b.data('label')}(${sizeB}) = ${cmpResult}`);
        return cmpResult; // Ascending order
    }, 
};
//WIPS
export default teammatesFcose;
export { tierGrid, commonTeammates, cclayoutOptions };