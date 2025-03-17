// ImprovedTestGraph.tsx
import React, { useEffect, useRef, useState, useLayoutEffect } from 'react';
import Cytoscape, { ElementsDefinition, ElementDefinition } from 'cytoscape';
import fcose from 'cytoscape-fcose';
import Pokemon from '@/classes/Pokemon';
import { PokemonTier } from '@/classes/PokemonSet';
import LayoutManager from './LayoutManager';
import LayoutControls from './LayoutControls';
import layouts from './Layouts';
import improvedStyles from './Styles';

// Register the fcose layout algorithm
Cytoscape.use(fcose);

interface TestGraphProps {
  team: PokemonTier;
}

const ImprovedTestGraph: React.FC<TestGraphProps> = ({ team }) => {
  const cyRef = useRef<HTMLDivElement>(null);
  const [cy, setCy] = useState<Cytoscape.Core | null>(null);
  const [layoutManager, setLayoutManager] = useState<LayoutManager | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [initAttempted, setInitAttempted] = useState<boolean>(false);
  const [graphStats, setGraphStats] = useState({
    nodeCount: 0,
    edgeCount: 0,
  });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Debug logging function
  const debug = (message: string, data?: any) => {
    console.log(`[ImprovedTestGraph] ${message}`, data || '');
  };

  // First render - Just show the container
  useEffect(() => {
    debug("Component mounted");
    
    // Always render the container first to ensure ref is available
    setIsLoading(true);
    
    // Cleanup function
    return () => {
      if (cy) {
        debug("Cleanup: destroying Cytoscape instance");
        cy.destroy();
      }
    };
  }, []);

  // Wait for DOM to be ready and ref to be available
  useLayoutEffect(() => {
    debug("DOM ready, checking ref");
    
    if (!initAttempted && cyRef.current) {
      debug("Ref is available, can initialize graph");
      setInitAttempted(true);
    }
  }, [initAttempted]);

  // After ref is available and initAttempted is true, initialize the graph
  useEffect(() => {
    if (!initAttempted || !cyRef.current || !team?.pokemons?.length) {
      return;
    }
    
    debug("Starting initialization with available ref");
    debug("Team data received", team);
    debug(`Team has ${team.pokemons.length} pokemons`);
    
    try {
      debug("Starting graph initialization");
      setIsLoading(true);
      setErrorMsg(null);
      
      // Create nodes
      let nodes: ElementDefinition[] = [];
      
      try {
        nodes = team.pokemons.map((item: Pokemon, index) => {
          if (!item) {
            debug(`Null pokemon at index ${index}`);
            return null;
          }
          
          debug(`Processing pokemon: ${item.species}`);
          
          try {
            const realUsage = item.usage?.usage?.real !== undefined ? item.usage.usage.real : 0;
            const baseSize = 100;
            const sizeVariance = 500;
            const gridScale = 350.0;
            const size = (realUsage * sizeVariance) + baseSize;
            const scaleX = size / 40;
            const scaleY = size / 30;
            
            return {
              group: 'nodes',
              selected: false,
              data: {
                id: item.info?.natdexnumber
                  ? `pokemon-${item.species}-${item.info.natdexnumber}`
                  : `pokeIND-${index}`,
                species: item.species,
                label: `${item.species} (${(realUsage*100).toFixed(2)}%)`,
                teammates: item.usage?.teammates ? item.usage.teammates : {},
                size: size,
                sprite: 'sprites/pokemonicons-sheet.png',
                spriteWidth: 480 * scaleX + 'px',
                spriteHeight: 3990 * scaleY + 'px',
                spritePositionX: item.displayinfo?.spritesheetCoords
                  ? item.displayinfo.spritesheetCoords[0] * scaleX + 'px'
                  : '0px',
                spritePositionY: item.displayinfo?.spritesheetCoords
                  ? item.displayinfo.spritesheetCoords[1] * scaleY + 'px'
                  : '0px',
                gridSpritePositionX: item.displayinfo?.spritesheetCoords
                  ? item.displayinfo.spritesheetCoords[0] * (gridScale/40) + 'px'
                  : '0px',
                gridSpritePositionY: item.displayinfo?.spritesheetCoords
                  ? item.displayinfo.spritesheetCoords[1] * (gridScale/30) + 'px'
                  : '0px',
                colors: [item.displayinfo?.type1color, item.displayinfo?.type2color],
              },
            };
          } catch (itemErr) {
            debug(`Error processing pokemon ${item.species}:`, itemErr);
            return null;
          }
        }).filter(Boolean) as ElementDefinition[];
      } catch (nodesErr) {
        debug("Error creating nodes:", nodesErr);
        throw new Error("Failed to create nodes from pokemon data");
      }
      
      if (nodes.length === 0) {
        debug("No valid nodes could be created");
        setIsLoading(false);
        setErrorMsg("No valid Pokémon data could be processed");
        return;
      }
      
      debug(`Successfully created ${nodes.length} nodes`);
      
      // Create edges based on teammate relationships
      const edges: Cytoscape.EdgeDefinition[] = [];
      
      try {
        for (let i = 0; i < nodes.length; i++) {
          const teammates = nodes[i].data.teammates;
          if (!teammates) continue;
          
          Object.entries(teammates).forEach(([teammate, value]) => {
            let targetNode = nodes.find(node => node.data.species === teammate);
            if (targetNode) {
              const weight = Number(value) * 100;
              const threshold = 10; // Minimum weight to create an edge
              
              if (weight > threshold) {
                edges.push({
                  group: 'edges',
                  data: {
                    id: `edge-${nodes[i].data.id}-${targetNode.data.id}`,
                    source: nodes[i].data.id as string,
                    target: targetNode.data.id as string,
                    weight: weight,
                    label: `${weight.toFixed(1)}%`,
                  }
                });
              }
            }
          });
        }
      } catch (edgesErr) {
        debug("Error creating edges:", edgesErr);
        // Don't throw here, we can proceed with nodes only
      }
      
      debug(`Created ${edges.length} edges`);
      setGraphStats({
        nodeCount: nodes.length,
        edgeCount: edges.length,
      });
      
      // If there's an existing instance, destroy it
      if (cy) {
        debug("Destroying previous Cytoscape instance");
        cy.destroy();
      }
      
      // Double check that ref is still available
      if (!cyRef.current) {
        debug("ERROR: cyRef no longer available");
        setErrorMsg("Graph container not available");
        setIsLoading(false);
        return;
      }
      
      // Create the Cytoscape instance
      debug("Creating new Cytoscape instance");
      const elements: ElementsDefinition = { nodes, edges };
      
      try {
        const cyInstance = Cytoscape({
          container: cyRef.current,
          elements: elements,
          style: improvedStyles,
          wheelSensitivity: 0.3,
        });
        
        setCy(cyInstance);
        
        // Create and configure the layout manager
        const manager = new LayoutManager(cyInstance);
        
        // Register all layouts with their transformations
        debug("Registering layouts");
        manager.registerLayout(
          'fcose', 
          layouts.fcose,
          (cy) => {
            cy.elements().removeClass('hidden centered tile');
            cy.nodes().removeClass('hidden centered tile');
            cy.edges().addClass('hidden');
          },
          'Force-directed layout showing all Pokémon',
          '🔄'
        );
        
        manager.registerLayout(
          'grid', 
          layouts.grid,
          (cy) => {
            cy.elements().removeClass('hidden centered');
            cy.nodes().addClass('tile');
            cy.edges().addClass('hidden');
          },
          'Grid view showing all Pokémon as tiles',
          '🔲'
        );
        
        manager.registerLayout(
          'circle', 
          layouts.circle,
          (cy) => {
            cy.nodes().removeClass('hidden centered tile');
            cy.edges().removeClass('hidden');
          },
          'Circle layout showing relationships between all Pokémon',
          '⭕'
        );
        
        manager.registerLayout(
          'concentric',
          layouts.concentric,
          (cy) => {
            cy.nodes().removeClass('hidden centered tile');
            cy.edges().removeClass('hidden');
          },
          'Concentric layout with most used Pokémon in the center',
          '🎯'
        );
        
        // Apply the initial layout
        debug("Applying initial layout");
        manager.applyLayout('fcose');
        setLayoutManager(manager);
        
        debug("Initialization complete, setting isLoading to false");
        setIsLoading(false);
      } catch (cyErr) {
        debug("Error initializing Cytoscape:", cyErr);
        setErrorMsg("Failed to initialize graph visualization");
        setIsLoading(false);
        return;
      }
    } catch (error) {
      debug("Fatal error during graph setup:", error);
      setErrorMsg(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsLoading(false);
    }
  }, [team, initAttempted]);

  // Handle node click events
  useEffect(() => {
    if (!cy || !layoutManager) return;
    
    debug("Setting up node click handlers");
    
    const handleNodeClick = (event: Cytoscape.EventObject) => {
      const clickedNode = event.target;
      debug("Node clicked:", clickedNode.data('species'));
      setSelectedNode(clickedNode.data('species'));
      
      if (layoutManager.currentLayout === 'grid' || layoutManager.currentLayout === 'fcose') {
        // When in overview modes, clicking a node focuses on it
        debug("Focusing on node from overview mode");
        layoutManager.focusOnNode(clickedNode);
      } else if (layoutManager.currentLayout === 'focus' && clickedNode.hasClass('centered')) {
        // When in focus mode, clicking the centered node goes back to grid view
        debug("Returning to grid view from focus mode");
        layoutManager.applyLayout('grid');
      } else {
        // In any other layout, clicking a node focuses on it
        debug("Focusing on node from other layout");
        layoutManager.focusOnNode(clickedNode);
      }
    };
    
    cy.on('tap', 'node', handleNodeClick);
    
    // Handle background click to go back to grid view when in focus mode
    const handleBackgroundClick = (event: Cytoscape.EventObject) => {
      if (event.target === cy && layoutManager.currentLayout === 'focus') {
        debug("Background clicked, returning to grid view");
        layoutManager.applyLayout('grid');
      }
    };
    
    cy.on('tap', handleBackgroundClick);
    
    return () => {
      debug("Removing event handlers");
      cy.off('tap', 'node', handleNodeClick);
      cy.off('tap', handleBackgroundClick);
    };
  }, [cy, layoutManager]);

  // Display node details when a node is selected
  const renderNodeDetails = () => {
    if (!selectedNode || !cy) return null;
    
    debug("Rendering details for node:", selectedNode);
    
    const nodeData = cy.nodes().filter(node => node.data('species') === selectedNode).first();
    if (!nodeData) {
      debug("Node data not found for:", selectedNode);
      return null;
    }
    
    const data = nodeData.data();
    
    return (
      <div className="node-details">
        <h3>{data.species}</h3>
        <p>Usage: {parseFloat(data.label.match(/\((.*?)%\)/)?.[1] || "0").toFixed(2)}%</p>
        
        <h4>Common Teammates:</h4>
        <ul className="teammates-list">
          {Object.entries(data.teammates)
            .sort(([, a], [, b]) => (b as any) - (a as any))
            .slice(0, 5)
            .map(([teammate, value]) => (
              <li key={teammate} onClick={() => {
                const teammateNode = cy.nodes().filter(node => node.data('species') === teammate).first();
                if (teammateNode && layoutManager && teammateNode.isNode()) {
                  debug("Navigating to teammate:", teammate);
                  layoutManager.focusOnNode(teammateNode);
                  setSelectedNode(teammate);
                }
              }}>
                {teammate}: {((value as number) * 100).toFixed(1)}%
              </li>
            ))
          }
        </ul>
        
        <button 
          className="close-details" 
          onClick={() => setSelectedNode(null)}
        >
          Close
        </button>
      </div>
    );
  };

  return (
    <div className="graph-container">
      {layoutManager && (
        <LayoutControls layoutManager={layoutManager} />
      )}
      
      <div className="graph-stats">
        <span>Pokémon: {graphStats.nodeCount}</span>
        <span>Connections: {graphStats.edgeCount}</span>
      </div>
      
      {/* Always render the container div to ensure ref gets attached */}
      <div className="cytoscape-container">
        <div ref={cyRef} style={{backgroundImage: "sprites/pokemonicons-sheet.png", width: '100%', height: '85vh'}}></div>
        {isLoading && (
          <div className="loading-overlay">
            <div className="loading-indicator">Loading Pokémon data...</div>
          </div>
        )}
        {errorMsg && (
          <div className="error-overlay">
            <div className="error-message">
              <p>{errorMsg}</p>
              <button onClick={() => window.location.reload()}>Reload</button>
            </div>
          </div>
        )}
        {selectedNode && renderNodeDetails()}
      </div>
      
      <style jsx>{`
        .graph-container {
          display: flex;
          flex-direction: column;
          width: 100%;
          height: 85vh;
          position: relative;
        }
        
        .graph-stats {
          display: flex;
          gap: 16px;
          margin-bottom: 8px;
          font-size: 14px;
          color: #666;
        }
        
        .cytoscape-container {
          position: relative;
          flex: 1;
          width: 100%;
        }
        
        .loading-overlay, .error-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: rgba(255, 255, 255, 0.8);
          z-index: 10;
        }
        
        .loading-indicator, .error-message {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 20px;
          background-color: white;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          text-align: center;
        }
        
        .error-message button {
          margin-top: 20px;
          padding: 8px 16px;
          background-color: #f0f0f0;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        
        .error-message button:hover {
          background-color: #e0e0e0;
        }
        
        .node-details {
          position: absolute;
          top: 20px;
          right: 20px;
          background: white;
          border-radius: 8px;
          padding: 16px;
          width: 280px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          z-index: 10;
        }
        
        .node-details h3 {
          margin-top: 0;
          margin-bottom: 8px;
        }
        
        .teammates-list {
          padding-left: 16px;
          margin: 8px 0;
        }
        
        .teammates-list li {
          cursor: pointer;
          margin-bottom: 4px;
          transition: color 0.2s;
        }
        
        .teammates-list li:hover {
          color: #3273dc;
        }
        
        .close-details {
          margin-top: 8px;
          padding: 6px 12px;
          border: none;
          border-radius: 4px;
          background: #f0f0f0;
          cursor: pointer;
        }
        
        .close-details:hover {
          background: #e0e0e0;
        }
      `}</style>
    </div>
  );
};

export default ImprovedTestGraph;