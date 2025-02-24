import React, { useEffect, useRef } from 'react';
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
    idealEdgeLength?: number;
    edgeElasticity?: number;
    nestingFactor?: number;
    gravity?: number;
    numIter?: number;
    tile?: boolean;
    animate?: 'during' | 'end' | false;
    animationDuration?: number;
    tilingPaddingVertical?: number;
    tilingPaddingHorizontal?: number;
    gravityRangeCompound?: number;
    gravityCompound?: number;
    gravityRange?: number;
    initialEnergyOnIncremental?: number;
}

const flayoutOptions: FcoseLayoutOptions = {
    name: 'fcose',
    nodeRepulsion: 100,
    idealEdgeLength: 500,
    edgeElasticity: 0.45,
    nestingFactor: 0.1,
    gravity: 0.25,
    numIter: 25000000,
    tile: true,
    animate: 'end',
    animationDuration: 5000,
    tilingPaddingVertical: 10,
    tilingPaddingHorizontal: 10,
    gravityRangeCompound: 1.5,
    gravityCompound: 1.0,
    gravityRange: 3.8,
    initialEnergyOnIncremental: 0.5
};
interface circleLayoutOptions {
    name: 'circle';
}

const clayoutOptions: circleLayoutOptions = {
    name: 'circle',
};

const TestGraph: React.FC<TestGraphProps> = ({ team }) => {
    const cyRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (cyRef.current && team.pokemons.length > 0) {
            const nodes: ElementDefinition[] = team.pokemons.map((item: Pokemon, index) => ({
                group: 'nodes',
                data: { 
                    id: item.info.natdexnumber ? `poke-${item.info.natdexnumber}` : `poke-${index}`,
                    label: item.species, 
                    teammates: item.UsageEntry.movesetUsage ? item.UsageEntry.movesetUsage.Teammates : [],
                    size: item.UsageEntry.movesetUsage ? item.UsageEntry.movesetUsage.Raw_count/1 : 10,
                    sprite: item.displayinfo.spriteRelativePath,
                    color1: item.displayinfo.type1color,
                    color2: item.displayinfo.type2color,
                }
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
            console.log('successfully made:', edges.length, " of ", team.pokemons.length);
            console.log('edges:', edges);

            const elements: ElementsDefinition = { nodes, edges };
            
            // Create the Cytoscape instance
            const cy = Cytoscape({
                container: cyRef.current,
                elements,
                style: [
                    {
                        selector: 'node',
                        style: {
                            'color': 'data(color2)',
                            'background-color': 'data(color1)',
                            'label': 'data(label)',
                            'width': 'mapData(size, 0, 10000, 50, 200)',
                            'height': 'mapData(size, 0, 10000, 50, 200)',
                            'background-image': 'data(sprite)',
                            'background-fit': 'contain',
                            'background-offset-x': '50%',
                            'background-offset-y': '-100%'
                        }
                    },
                    {
                        selector: 'edge',
                        style: {
                            'width': 'mapData(weight, 0, 100, 1, 10)',
                            'line-color': '#ccc',
                            'target-arrow-color': '#ccc',
                            'target-arrow-shape': 'triangle'
                        }
                    }
                ]
            });

            // Run the layout
            cy.layout(flayoutOptions).run();

            // Cleanup function
            return () => {
                cy.destroy();
            };
        }
    }, [team]);

    return <div ref={cyRef} style={{ width: '100%', height: '95vh' }} />;
};

export default TestGraph;