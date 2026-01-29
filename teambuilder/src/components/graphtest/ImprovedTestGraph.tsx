// ImprovedTestGraph.tsx with improved panel visibility logic
import React, { useEffect, useRef, useState, useLayoutEffect } from 'react';
import Cytoscape, { ElementsDefinition, ElementDefinition } from 'cytoscape';
import fcose from 'cytoscape-fcose';
import Pokemon from '@/classes/Pokemon';
import { PokemonTier } from '@/classes/PokemonSet';
import LayoutManager from '../graphtest/LayoutManager';
import LayoutControls from './LayoutControls';
import LayoutControlsWrapper from '../ui/LayoutControlsWrapper';
import layouts from './Layouts';
import styles from '../graphtest/Styles';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, RotateCcw, X } from "lucide-react";

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
  const [showNodeDetails, setShowNodeDetails] = useState<boolean>(false);

  // Debug logging function
  const debug = (message: string, data?: any) => {
    console.log(`[ImprovedTestGraph] ${message}`, data || '');
  };

  // First render - Just show the container
  useEffect(() => {
    debug("Component mounted");
    setIsLoading(true);
    
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

  // Improved layout change monitoring with direct currentLayout tracking
  useEffect(() => {
    if (!layoutManager) return;
    
    // This function is called whenever the layout changes
    const handleLayoutChange = () => {
      console.log("Layout changed to:", layoutManager.currentLayout);
      
      // Immediately hide panel when not in focus mode
      if (layoutManager.currentLayout !== 'focus') {
        setShowNodeDetails(false);
        setSelectedNode(null);
      } else if (layoutManager.currentLayout === 'focus' && layoutManager.selectedNode) {
        // Show panel in focus mode with the correct data
        const species = layoutManager.selectedNode.data('species');
        setSelectedNode(species);
        setShowNodeDetails(true);
      }
    };
    
    // Call immediately to set initial state
    handleLayoutChange();
    
    // Set up a polling mechanism to detect layout changes
    // This is more reliable than depending on state updates or observers
    const intervalId = setInterval(() => {
      // Store static reference to current values to compare
      const currentLayout = layoutManager.currentLayout;
      const currentSelectedNode = layoutManager.selectedNode;
      
      // Check if we need to update UI state based on layout manager state
      if (currentLayout === 'focus' && currentSelectedNode) {
        if (!showNodeDetails || selectedNode !== currentSelectedNode.data('species')) {
          setSelectedNode(currentSelectedNode.data('species'));
          setShowNodeDetails(true);
        }
      } else if (currentLayout !== 'focus' && (showNodeDetails || selectedNode !== null)) {
        setShowNodeDetails(false);
        setSelectedNode(null);
      }
    }, 100);
    
    return () => clearInterval(intervalId);
  }, [layoutManager, showNodeDetails, selectedNode]);

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
              const weight = Number(value) * 100; // Convert to percentage
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
          style: styles,
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
        );
        
        manager.registerLayout(
          'circle', 
          layouts.circle,
          (cy) => {
            cy.nodes().removeClass('hidden centered tile');
            cy.edges().removeClass('hidden');
          },
          'Circle layout showing relationships between all Pokémon',
        );
        
        manager.registerLayout(
          'concentric',
          layouts.concentric,
          (cy) => {
            cy.nodes().removeClass('hidden centered tile');
            cy.edges().removeClass('hidden');
          },
          'Concentric layout with most used Pokémon in the center',
        );
        
        manager.registerLayout(
          'focus',
          layouts.focus || layouts.circle, // Fallback to circle if focus not available
          (cy) => {
            // Focus layout is handled by focusOnNode method
          },
          'Focus view showing a Pokémon and its connections',
        );
        
        // Apply the initial layout
        debug("Applying initial layout");
        manager.applyLayout('grid'); // Changed from fcose to grid as the default
        
        // Ensure panel is hidden on initialization
        setShowNodeDetails(false);
        setSelectedNode(null);
        
        // Set layout manager only after ensuring panel is hidden
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

  // Completely rewritten node click handling with better state management
  useEffect(() => {
    if (!cy || !layoutManager) return;
    
    debug("Setting up improved node click handlers");
    
    const handleNodeClick = (event: Cytoscape.EventObject) => {
      // Prevent click event propagation
      event.preventDefault();
      
      const clickedNode = event.target;
      debug("Node clicked:", clickedNode.data('species'));
      
      // Determine if we're going back to grid from focus mode
      const willReturnToGrid = layoutManager.currentLayout === 'focus' && 
                               clickedNode.hasClass('centered');
      
      // Important: Update UI state BEFORE calling focusOnNode
      if (willReturnToGrid) {
        debug("Will return to grid - hiding panel");
        // Hide panel immediately when returning to grid
        setShowNodeDetails(false);
        setSelectedNode(null);
      } else {
        debug("Will focus on node - showing panel");
        // Update selected node immediately
        setSelectedNode(clickedNode.data('species'));
        setShowNodeDetails(true);
      }
      
      // After UI state changes, apply the layout change
      setTimeout(() => {
        debug("Applying focusOnNode after UI state change");
        layoutManager.focusOnNode(clickedNode);
      }, 0);
    };
    
    // Handle background click to exit focus mode
    const handleBackgroundClick = (event: Cytoscape.EventObject) => {
      // Only handle clicks directly on the background (canvas)
      if (event.target === cy) {
        // Only exit focus mode if we're in it
        if (layoutManager.currentLayout === 'focus') {
          debug("Background clicked, returning to grid view");
          
          // First update UI state to hide panel
          setShowNodeDetails(false);
          setSelectedNode(null);
          
          // Then change layout (after a small delay)
          setTimeout(() => {
            layoutManager.applyLayout('grid');
          }, 0);
        }
      }
    };
    
    // Force panel to close when layout changes away from focus
    const handleLayoutChange = () => {
      if (layoutManager.currentLayout !== 'focus' && (showNodeDetails || selectedNode !== null)) {
        debug("Layout changed from focus - hiding panel");
        setShowNodeDetails(false);
        setSelectedNode(null);
      }
    };
    
    // Register all event handlers
    cy.on('tap', 'node', handleNodeClick);
    cy.on('tap', handleBackgroundClick);
    
    // Set up a layout change watcher for the LayoutManager
    const originalApplyLayout = layoutManager.applyLayout;
    layoutManager.applyLayout = function(name: string, selectedNode = null) {
      const result = originalApplyLayout.call(this, name, selectedNode);
      
      // Callback after layout changes
      if (name !== 'focus') {
        debug(`Layout changed to ${name} - ensuring panel is hidden`);
        setShowNodeDetails(false);
        setSelectedNode(null);
      }
      
      return result;
    };
    
    // Cleanup function
    return () => {
      debug("Removing event handlers");
      cy.off('tap', 'node', handleNodeClick);
      cy.off('tap', handleBackgroundClick);
      
      // Restore original method
      if (layoutManager) {
        layoutManager.applyLayout = originalApplyLayout;
      }
    };
  }, [cy, layoutManager, showNodeDetails, selectedNode]);

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* Full-size cytoscape container */}
      <div className="absolute inset-0 w-full h-full z-10">
        <div ref={cyRef} className="w-full h-full" />
      </div>
      
      {/* UI overlays with higher z-index */}
      
      {/* Title */}
      <div className="absolute top-0 left-0 right-0 z-20 p-2 bg-transparent text-center">
        <h1 className="text-xl font-semibold">Pokémon Team Visualization</h1>
      </div>
      
      {/* Controls overlay */}
      <div className="absolute top-12 left-0 right-0 z-30 px-4">
        <div className="bg-white/80 backdrop-blur-sm shadow-sm border border-gray-200 rounded-lg">
          <div className="p-4">
            {/* Layout info and description */}
            <div className="flex flex-col items-center text-sm mb-3">
              <span>Current Layout: <strong>{layoutManager?.currentLayout || 'loading...'}</strong></span>
              {layoutManager?.currentLayout === 'focus' && (
                <span className="text-xs text-muted-foreground">Focus view showing a Pokémon and its connections</span>
              )}
              {layoutManager?.currentLayout === 'fcose' && (
                <span className="text-xs text-muted-foreground">Force-directed layout showing all Pokémon</span>
              )}
              {layoutManager?.currentLayout === 'grid' && (
                <span className="text-xs text-muted-foreground">Grid view showing all Pokémon as tiles</span>
              )}
              {layoutManager?.currentLayout === 'circle' && (
                <span className="text-xs text-muted-foreground">Circle layout showing relationships between all Pokémon</span>
              )}
              {layoutManager?.currentLayout === 'concentric' && (
                <span className="text-xs text-muted-foreground">Concentric layout with most used Pokémon in the center</span>
              )}
            </div>
            
            {/* Centered navigation buttons */}
            <div className="flex justify-center gap-3 mb-3">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => window.history.back()}
                className="flex items-center gap-1"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  layoutManager?.reset();
                  setShowNodeDetails(false);
                  setSelectedNode(null);
                }}
                className="flex items-center gap-1"
              >
                <RotateCcw className="h-4 w-4" /> Reset
              </Button>
            </div>
            
            {/* Stats */}
            <div className="flex justify-center gap-6 text-sm text-muted-foreground">
              <span>Pokémon: {graphStats.nodeCount}</span>
              <span>Connections: {graphStats.edgeCount}</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Layout controls */}
      <div className="absolute top-44 left-0 right-0 z-30 px-4">
        {layoutManager && (
          <LayoutControlsWrapper layoutManager={layoutManager} />
        )}
      </div>
      
      {/* Loading and error overlays */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/40 backdrop-blur-sm z-50">
          <Card className="bg-white shadow-lg">
            <CardContent className="p-6 text-center">
              <p>Loading Pokémon data...</p>
            </CardContent>
          </Card>
        </div>
      )}
      
      {errorMsg && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/40 backdrop-blur-sm z-50">
          <Card className="bg-white shadow-lg">
            <CardContent className="p-6 text-center">
              <p>{errorMsg}</p>
              <Button 
                variant="outline" 
                onClick={() => window.location.reload()}
                className="mt-4"
              >
                Reload
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Node details panel with triple-check for focus mode only */}
      {selectedNode && cy && layoutManager && layoutManager.currentLayout === 'focus' && showNodeDetails && (
        <div 
          className={`absolute top-0 bottom-0 right-0 z-40 w-80 transition-transform duration-300 ease-in-out ${
            layoutManager.currentLayout === 'focus' ? 'translate-x-0' : 'translate-x-full'
          }`}
          key={`panel-${selectedNode}`} // Add key to force re-render on node change
        >
          <div className="h-full bg-white/80 backdrop-blur-sm shadow-lg border-l border-gray-200 flex flex-col">
            <div className="p-4 relative flex-grow overflow-y-auto">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  // First hide the panel
                  setShowNodeDetails(false);
                  
                  // If in focus mode, return to grid
                  if (layoutManager.currentLayout === 'focus') {
                    setTimeout(() => layoutManager.applyLayout('grid'), 0);
                  }
                }}
                className="absolute top-2 right-2"
              >
                <X className="h-4 w-4" />
              </Button>
              
              <h3 className="text-lg font-medium mt-4 mb-2">{selectedNode}</h3>
              <p className="mb-4">
                Usage: {parseFloat(cy.nodes().filter(node => node.data('species') === selectedNode).first().data('label').match(/\((.*?)%\)/)?.[1] || "0").toFixed(2)}%
              </p>
              
              <h4 className="font-medium mb-2">Common Teammates:</h4>
              <ul className="pl-4 space-y-2">
                {Object.entries(cy.nodes().filter(node => node.data('species') === selectedNode).first().data('teammates'))
                  .sort(([, a], [, b]) => (b as any) - (a as any))
                  .slice(0, 5)
                  .map(([teammate, value]) => (
                    <li 
                      key={teammate} 
                      className="cursor-pointer hover:bg-gray-100 p-1 rounded transition-colors"
                      onClick={() => {
                        const teammateNodes = cy.nodes().filter(node => node.data('species') === teammate);
                        if (teammateNodes.length > 0 && layoutManager) {
                          // Hide panel before switching
                          setShowNodeDetails(false);
                          setSelectedNode(teammate);
                          
                          setTimeout(() => {
                            const teammateNode = teammateNodes.first() as unknown as Cytoscape.NodeSingular;
                            layoutManager.focusOnNode(teammateNode);
                            // Show panel again with new node
                            setShowNodeDetails(true);
                          }, 0);
                        }
                      }}>
                      <span className="font-medium">{teammate}</span>: {((value as number) * 100).toFixed(1)}%
                    </li>
                  ))
                }
              </ul>
            </div>
            
            {/* Button container at the bottom */}
            <div className="p-4 border-t border-gray-200 bg-white/90">
              <Button 
                variant="default" 
                size="sm" 
                onClick={() => {
                  if (layoutManager) {
                    // Hide panel immediately
                    setShowNodeDetails(false);
                    setSelectedNode(null);
                    
                    // Change layout after brief delay
                    setTimeout(() => {
                      layoutManager.applyLayout('grid');
                    }, 0);
                  }
                }}
                className="w-full"
              >
                Return to Grid
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImprovedTestGraph;