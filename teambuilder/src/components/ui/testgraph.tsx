import React, { useEffect, useRef } from 'react';
import Cytoscape from 'cytoscape';
import Pokemon from '../../classes/Pokemon.js';
import PokemonSet from '../../classes/PokemonSet.js';

const TestGraph: React.FC = () => {
    const cyRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (cyRef.current) {
            const elements = Object.values(PokemonSet).map((item: any) => ({
                data: { 
                    id: item.natdexnumber, 
                    label: item.species, 
                    size: parseInt(item.usageEntry?.movesetUsage?.Raw_count) || 10
                }
            }));

            Cytoscape({
                container: cyRef.current,
                elements: elements,
                style: [
                    {
                        selector: 'node',
                        style: {
                            'background-color': '#666',
                            'label': 'data(label)',
                            'width': 'mapData(size, 1, 100000, 50, 500)',  // Scale dynamically
                            'height': 'mapData(size, 1, 100000, 50, 500)'  // Scale dynamically
                        }
                    },
                    {
                        selector: 'edge',
                        style: {
                            'width': 3,
                            'line-color': '#ccc',
                            'target-arrow-color': '#ccc',
                            'target-arrow-shape': 'triangle'
                        }
                    }
                ],
                layout: {
                    name: 'grid',
                    rows: 1
                }
            });
        }
    }, []);

    return <div ref={cyRef} style={{ width: '100%', height: '95vh' }} />;
};

export default TestGraph;
