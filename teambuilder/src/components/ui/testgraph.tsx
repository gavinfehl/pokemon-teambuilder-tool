import React, { useEffect, useRef, useState } from 'react';
import Cytoscape, { ElementsDefinition, ElementDefinition, LayoutOptions } from 'cytoscape';
import fcose from 'cytoscape-fcose';
import Pokemon from '../../classes/Pokemon';
import { PokemonSet } from '../../classes/PokemonSet';

Cytoscape.use(fcose);

interface TestGraphProps {
    team: PokemonSet;
}

// Define the fcose layout options interface
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
const flayoutOptions: FcoseLayoutOptions = {
    name: 'fcose',
    nodeRepulsion: 40000,
    idealEdgeLength: (edge) => {
        let idealLength = Math.max(20, 300 - (edge.data('weight')) * 4);
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
    animationDuration: 3000,
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

const glayoutOptions: gridLayoutOptions = {
    name: "grid",
    fit: true, // Whether to fit the viewport to the graph
    animate: true,
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
const clayoutOptions: circleLayoutOptions = {
    name: 'circle',
    fit: true,
    animate: true,
    animationDuration: 1000,
    avoidOverlap: false,
    nodeSpacing: 1000,
    boundingBox: { x1: 0, y1: 0, w: 2500, h: 2500 },
    startAngle: Math.PI / 2,
    clockwise: true,
    sort: function(a, b){ return a.data('size') - b.data('size') }, 
};

function circSort(){
    return 0;
}

interface TestGraphProps {
    team: PokemonSet;
}
const TestGraph: React.FC<TestGraphProps> = ({ team }) => {
    const cyRef = useRef<HTMLDivElement>(null);
    const [cy, setCy] = useState<Cytoscape.Core | null>(null);
    let currentLayout = "fcose";


    useEffect(() => {
        if (cyRef.current && team.pokemons.length > 0) {
            const nodes: ElementDefinition[] = team.pokemons.map((item: Pokemon, index) => ({
                group: 'nodes',
                selected: false,
                data: { 
                    id: item.info.natdexnumber ? `pokemon-${item.species}-${item.info.natdexnumber}` : `pokeIND-${index}`,
                    label: item.species, 
                    teammates: item.UsageEntry.movesetUsage ? item.UsageEntry.movesetUsage.Teammates : [],
                    size:  item.UsageEntry.movesetUsage ? item.UsageEntry.movesetUsage.Raw_count/1 : 0,
                    sprite: item.displayinfo.spriteRelativePath,
                    colors: [item.displayinfo.type1color, item.displayinfo.type2color],
                },
                
            }));
            const edges: Cytoscape.EdgeDefinition[] = [];
            
            interface Teammate {
                item: string;
                value: string;
            }

            interface EdgeData {
                id: string;
                source: string;
                target: string;
                weight: number;
            }

            for (let i = 0; i < nodes.length; i++) {
                const teammates = nodes[i].data.teammates;
                teammates.forEach((teammate: Teammate) => {
                    const targetNode = nodes.find(node => node.data.label === teammate.item);
                    if (targetNode) {
                        const edgeData: EdgeData = {
                            id: `edge-${nodes[i].data.id}-${targetNode.data.id}`,
                            source: nodes[i].data.id as string,
                            target: targetNode.data.id as string,
                            weight: parseFloat(teammate.value)
                        };
                        edges.push({
                            group: 'edges',
                            data: edgeData
                        });
                    }
                });
            }
            console.log('successfully made:', nodes.length, " of ", team.pokemons.length);
            console.log('nodes:', nodes);
            console.log('successfully made:', edges.length);
            console.log('edges:', edges);

            const elements: ElementsDefinition = { nodes, edges };
            const fStyleOptions = [
                {
                    selector: 'node',
                    style: {
                        'color': 'black',
                        'background-fill': 'radial-gradient',
                        'background-gradient-stop-colors': 'data(colors)',
                        //'shape': 'star',
                        //'label': 'data(label)',
                        'width': 'mapData(size, 0, 50000, 50, 200)',
                        'height': 'mapData(size, 0, 50000, 50, 200)',
                        'background-image': 'data(sprite)',
                        'background-fit': 'contain',
                        'background-offset-x': '50%',
                        'background-offset-y': '-100%'
                    }
                },
                {
                    selector: 'node.centered',
                    style: {
                        'color': 'black',
                        'background-fill': 'radial-gradient',
                        'background-gradient-stop-colors': 'data(colors)',
                        'shape': 'star',
                        'label': 'data(label)',
                        'font-size': '50',
                        'width': '300',
                        'height': '300',
                        'background-image': 'data(sprite)',
                        'background-fit': 'contain',
                        'background-offset-x': '50%',
                        'background-offset-y': '-100%'
                    }
                },
                {
                    selector: 'node.tile',
                    style: {
                        'color': 'black',
                        'background-fill': 'linear-gradient',
                        'background-gradient-stop-colors': 'data(colors)',
                        'shape': 'rectangle',
                        //'label': 'data(label)',
                        //'font-size': '20',
                        'width': '300',
                        'height': '300',
                        'background-image': 'data(sprite)',
                        'background-fit': 'contain',
                        'background-offset-x': '50%',
                        'background-offset-y': '-100%'
                    }
                },
                {
                    selector: 'edge',
                    style: {
                        'width': 'mapData(weight, 0, 100, 0, 10)',
                        'line-color': '#ccc',
                        'target-arrow-color': '#ccc',
                        'target-arrow-shape': 'triangle'
                    }
                },
                {
                    selector: 'edge.hidden',
                    style: {
                        'width': 0
                    }
                }
            ]


            // Create the Cytoscape instance
            const cyInstance = Cytoscape({
                container: cyRef.current,
                elements: elements,
                style: fStyleOptions
            });

            setCy(cyInstance);
            cyInstance.layout(flayoutOptions).run();

            cyInstance.style(fStyleOptions);

            // Cleanup function
            return () => {
                cyInstance.destroy();
            };
        }
    }, [team]);

    useEffect(() => {
        if (!cy) return;
        const handleNodeClick = (event: Cytoscape.EventObject) => {
            const clickedNode = event.target;
            console.log("curr layout on click:", currentLayout);
            if (currentLayout == "circle") {
                // Switch back to fcose layout
                cy.$(':selected').deselect();
                currentLayout = "fcose";
                cy.pan({
                    x: 0,
                    y: 0 
                });
                cy.layout(glayoutOptions).run();
                cy.nodes().removeClass('centered');
                cy.edges().removeClass('hidden');
                //grid test stuff
                cy.edges().addClass('hidden');
                cy.nodes().addClass('tile');
            }
            else {
                // Switch to circle layout with clicked node centered
                //grid test stuff   
                cy.nodes().removeClass('tile');
                clickedNode.addClass('centered');
                currentLayout = "circle";
                layoutWithExclusions(clayoutOptions);
                clickedNode.position({
                    x: 1250,
                    y: 1250
                });
                updateEdgeVisibility(clickedNode);
            }
        };
        const updateEdgeVisibility = (clickedNode: Cytoscape.NodeSingular) => {
            cy.edges().removeClass('hidden');
            cy.edges().forEach(edge => {
                const source = edge.source();
                const target = edge.target();
                if (!source.same(clickedNode) && !target.same(clickedNode)) {
                    console.log("hiding edge:", edge);
                    edge.addClass('hidden');
                }
            });
        }
        const layoutWithExclusions = (layoutOptions: LayoutOptions) => {
            if (!cy) return;
        
            // Filter out nodes with the 'centered' class
            const noncenteredNodes = cy.elements().difference(cy.elements('.centered'));
            cy.pan({
                x: 0,
                y: 0 
            });
            // Apply the layout to the filtered elements
            noncenteredNodes.layout(layoutOptions).run();
        };


        cy.on('tap', 'node', handleNodeClick);
        return () => {
            cy.off('tap', 'node', handleNodeClick);
        };
    }, [cy]);

    return <div ref={cyRef} style={{ width: '100%', height: '95vh' }} />;
};

export default TestGraph;