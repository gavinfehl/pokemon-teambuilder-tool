import React, { useEffect, useRef } from 'react';
import Cytoscape, { ElementsDefinition, ElementDefinition } from 'cytoscape';
import Pokemon from '../../classes/Pokemon';
import { PokemonSet } from '../../classes/PokemonSet';

interface TestGraphProps {
    team: PokemonSet;
}

const TestGraph: React.FC<TestGraphProps> = ({ team }) => {
    const cyRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        if (cyRef.current && team.pokemons.length > 0) {
            const nodes: ElementDefinition[] = team.pokemons.map((item: Pokemon, index) => ({
                group: 'nodes',  // Ensures it's explicitly typed
                data: { 
                    id: item.info.natdexnumber ? `poke-${item.info.natdexnumber}` : `poke-${index}`,
                    label: item.species, 
                    size: item.UsageEntry.movesetUsage ? item.UsageEntry.movesetUsage.Raw_count/1 : 10
                }
            }));

            const elements: ElementsDefinition = { nodes, edges: [] };
            console.log('successfully made:', nodes.length, " of ", team.pokemons.length);
            console.log('nodes:', nodes);

            Cytoscape({
                container: cyRef.current,
                elements,
                style: [
                    {
                        selector: 'node',
                        style: {
                            'background-color': '#999',
                            'label': 'data(label)',
                            'width': 'mapData(size, 0, 10000, 0, 100)',
                            'height': 'mapData(size, 0, 10000, 0, 100)'
                        }
                    }
                ],
                layout: { name: 'circle' }
            });
        }
    }, [team]);

    return <div ref={cyRef} style={{ width: '100%', height: '95vh' }} />;
};

export default TestGraph;
