import React, { useEffect, useRef, useState } from 'react';
import Cytoscape, { ElementsDefinition, ElementDefinition, LayoutOptions } from 'cytoscape';
import fcose from 'cytoscape-fcose';
import Pokemon from '@/classes/Pokemon'
import {PokemonSet, PokemonTeam, PokemonTier} from '@/classes/PokemonSet'
import styleOptions from './testgraphstyles'
import flayoutOptions, { glayoutOptions, clayoutOptions, cclayoutOptions } from './testgraphlayouts';
Cytoscape.use(fcose);

interface TestGraphProps {
    team: PokemonTier;
    //tier: PokemonTier;
}
const TestGraph: React.FC<TestGraphProps> = ({ team }) => {
    const cyRef = useRef<HTMLDivElement>(null);
    const [cy, setCy] = useState<Cytoscape.Core | null>(null);
    let currentLayout = "fcose";


    useEffect(() => {
        if (cyRef.current && team.pokemons.length > 0) {
            let nodes: ElementDefinition[] = team.pokemons.map((item: Pokemon, index) => {
              const realUsage = item.usage.usage.real ? item.usage.usage.real : 0;
              const baseSize = 100;
              const sizeVariance = 500;
              const gridScale = 350.0;
              const size = (realUsage * sizeVariance) + baseSize; // Scale from 0-100 to 100-350 pixels
              const scaleX = size / 40; // 40 is the original sprite width
              const scaleY = size / 30; // 40 is the original sprite width
        
              return {
                group: 'nodes',
                selected: false,
                data: {
                  id: item.info.natdexnumber
                    ? `pokemon-${item.species}-${item.info.natdexnumber}`
                    : `pokeIND-${index}`,
                  species: item.species,
                  label: `${item.species} (${(realUsage*100).toFixed(2)}%)`,
                  teammates: item.usage.teammates ? item.usage.teammates : {},
                  size: size,
                  sprite: 'sprites/pokemonicons-sheet.png',
                  spriteWidth: 480 * scaleX + 'px',
                  spriteHeight: 3990 * scaleY + 'px',
                  spritePositionX: item.displayinfo.spritesheetCoords
                    ? item.displayinfo.spritesheetCoords[0] * scaleX + 'px'
                    : '0px',
                  spritePositionY: item.displayinfo.spritesheetCoords
                    ? item.displayinfo.spritesheetCoords[1] * scaleY + 'px'
                    : '0px',
                  gridSpritePositionX: item.displayinfo.spritesheetCoords
                    ? item.displayinfo.spritesheetCoords[0] * (gridScale/40) + 'px'
                    : '0px',
                  gridSpritePositionY: item.displayinfo.spritesheetCoords
                    ? item.displayinfo.spritesheetCoords[1] * (gridScale/30) + 'px'
                    : '0px',
                  colors: [item.displayinfo.type1color, item.displayinfo.type2color],
                },
              };
            });
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
                label: string
            }


            for (let i = 0; i < nodes.length; i++) {
                const teammates = nodes[i].data.teammates;
                Object.entries(teammates).map(([teammate, value]) => {
                    let targetNode = nodes.find(node => node.data.species === teammate);
                    if (targetNode) {
                        let edgeData: EdgeData = {
                            id: `edge-${nodes[i].data.id}-${targetNode.data.id}`,
                            source: nodes[i].data.id as string,
                            target: targetNode.data.id as string,
                            weight: Number(value)*100,
                            label: String((Number(value)*100).toFixed(1)+"%"),
                        };
                        const threshold = 10; // you must have a weight of at least this % to become a real edge.
                        if (edgeData.weight > threshold) {
                            edges.push({
                                group: 'edges',
                                data: edgeData
                            });
                        }
                        // ... your edge data processing logic
                    }
                });
            }
            
            console.log('successfully made:', nodes.length, " of ", team.pokemons.length);
            console.log('nodes:', nodes);
            console.log('successfully made:', edges.length);
            console.log('edges:', edges);

            const elements: ElementsDefinition = { nodes, edges };
            


            // Create the Cytoscape instance
            const cyInstance = Cytoscape({
                container: cyRef.current,
                elements: elements,
                style: styleOptions
            });

            setCy(cyInstance);
            nodes = elements.nodes.sort(function( a, b ){
                console.log(a.data.species, a.data.size, "-", b.data.species, b.data.size, "=", a.data.size - b.data.size);
                return a.data.size - b.data.size;
            });

            // fcose first
            currentLayout = "fcose";
            cyInstance.edges().addClass('hidden');
            cyInstance.layout(flayoutOptions).run();

            cyInstance.style(styleOptions);

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
            switch(currentLayout){
                case "circle":
                    // Switch to grid layout
                    if (clickedNode.hasClass('centered')){
                        cy.$(':selected').deselect();
                        currentLayout = "grid";
                        cy.layout(glayoutOptions).run();
                        cy.fit(cy.nodes(),50);
                        cy.nodes().removeClass('hidden centered tile');
                        cy.edges().addClass('hidden');
                        cy.nodes().addClass('tile');
                    }else{
                        //grid test stuff   
                        currentLayout = "circle";
                        layoutWithExclusions(clayoutOptions, clickedNode);
                        cy.fit(cy.nodes(),0);
                        clickedNode.position({
                            x: 1250,
                            y: 1250
                        });
                        updateEdgeVisibility(clickedNode);
                    }
                    
                    break;

                case "grid":
                default:
                    // Switch to circle layout with clicked node centered
                    //grid test stuff   
                    cy.nodes().removeClass('tile');
                    currentLayout = "circle";
                    layoutWithExclusions(clayoutOptions, clickedNode);
                    cy.fit(cy.nodes(),0);
                    clickedNode.position({
                        x: 1250,
                        y: 1250
                    });
                    updateEdgeVisibility(clickedNode);
                    break;
            }
        }
        const updateEdgeVisibility = (clickedNode: Cytoscape.NodeSingular) => {
            cy.edges().removeClass('hidden');
            cy.edges().forEach(edge => {
                const source = edge.source();
                const target = edge.target();
                if (!source.same(clickedNode) 
                    //&& !target.same(clickedNode)
                ) {
                    //console.log("hiding edge:", edge);
                    edge.addClass('hidden');
                }
            });
        }
        const layoutWithExclusions = (layoutOptions: LayoutOptions, centeredNode: Cytoscape.NodeSingular) => {
            if (!cy) return;
        
            // Get neighbors (nodes directly connected to the centered node)
            const outgoingEdges = centeredNode.outgoers('edge');
            const connectedNodes = outgoingEdges.targets();
        
            // Hide all other nodes
            cy.nodes().removeClass('hidden centered tile');
            cy.nodes().not(connectedNodes).addClass('hidden');
            centeredNode.removeClass('hidden');
            centeredNode.addClass('centered');
        
            // Apply the layout only to the centered node and its direct neighbors  
            connectedNodes.layout(layoutOptions).run();
        };
        


        cy.on('tap', 'node', handleNodeClick);
        return () => {
            cy.off('tap', 'node', handleNodeClick);
        };
    }, [cy]);

    return <div ref={cyRef} style={{backgroundImage: "sprites/pokemonicons-sheet.png", width: '100%', height: '85vh'}} />;
};

export default TestGraph;