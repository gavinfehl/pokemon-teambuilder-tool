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
  const [showFcoseDebugEdges, setShowFcoseDebugEdges] = useState<boolean>(false);

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


  // 
  const COMMON_TEAMMATE_THRESHOLD = 0; 

  // Function to setup hover behavior for fcose layout WITH THRESHOLD
  const setupFcoseHoverBehavior = (cyInstance: Cytoscape.Core) => {
    debug("Setting up fcose hover behavior with threshold: " + COMMON_TEAMMATE_THRESHOLD);
    
    // Hide all regular edges initially (synergy edges already hidden)
    cyInstance.edges('[!type]').style('opacity', '0');
    
    // Hide all node labels initially
    cyInstance.nodes().style({
      'opacity': '1',
      'label': '',
      'text-opacity': '0'
    });
    
    // Remove any existing hover listeners first
    cyInstance.nodes().off('mouseover mouseout');
    
    // Add hover listeners to nodes
    cyInstance.nodes().on('mouseover', function(event) {
      const node = event.target;
      
      // Show label for hovered node
      node.style({
        'label': node.data('label'),
        'text-opacity': '1'
      });
      
      // Dim all other nodes
      cyInstance.nodes().not(node).style('opacity', '0.1');
      
      // Show outgoing directional edges from this node IF they meet threshold
      node.connectedEdges('[!type]').forEach((edge: any) => {
        if (edge.source().id() === node.id()) {
          const weight = edge.data('weight');
          
          // Only show edge if it meets the threshold
          if (weight >= COMMON_TEAMMATE_THRESHOLD) {
            edge.style({
              'opacity': '1',
              'label': edge.data('label')
            });
            // Full opacity and show label for target nodes
            edge.target().style({
              'opacity': edge.data('weight') >= COMMON_TEAMMATE_THRESHOLD ? Math.min(Math.max((edge.data('weight')/100)+0.25, 0.25), 1) : '0.1',
              'label': edge.target().data('label'),
              'text-opacity': '1'
            });
          }
        }
      });
    });
    
    cyInstance.nodes().on('mouseout', function(event) {
      const node = event.target;
      
      // Hide all labels
      cyInstance.nodes().style({
        'label': '',
        'text-opacity': '0'
      });
      cyInstance.edges('[!type]').style('label', '');
      
      // Reset all nodes to full opacity
      cyInstance.nodes().style('opacity', '1');
      
      // Hide all directional edges
      cyInstance.edges('[!type]').style('opacity', '0');
    });
  };

  // Function to cleanup hover behavior
  const cleanupFcoseHoverBehavior = (cyInstance: Cytoscape.Core) => {
    debug("Cleaning up fcose hover behavior");
    
    // Remove hover listeners
    cyInstance.nodes().off('mouseover mouseout');
    
    // Reset edge opacity and labels to default (visible)
    cyInstance.edges().style({
      'opacity': '1',
      'label': (ele: any) => ele.data('label')
    });
    
    // Reset node opacity and labels to default
    cyInstance.nodes().style({
      'opacity': '1',
      'label': (ele: any) => ele.data('label'),
      'text-opacity': '1'
    });
  };
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
      // EDGE CREATION FIX - Replace the edge creation section in ImprovedTestGraph.tsx (around line 290-326)

// EDGE CREATION FIX - Replace the edge creation section in ImprovedTestGraph.tsx (around line 290-326)

// Create edges based on teammate relationships - NO THRESHOLD (create all edges)
const edges: Cytoscape.EdgeDefinition[] = [];

try {
  for (let i = 0; i < nodes.length; i++) {
    const teammates = nodes[i].data.teammates;
    if (!teammates) continue;
    
    Object.entries(teammates).forEach(([teammate, value]) => {
      let targetNode = nodes.find(node => node.data.species === teammate);
      if (targetNode) {
        const weight = Number(value) * 100; // Convert to percentage
        
        // NO THRESHOLD - create all edges regardless of weight
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
        console.log(`Created edge from ${nodes[i].data.species} to ${teammate} with weight ${weight.toFixed(1)}%`);
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

      // Create synergy edges for fcose layout
      const synergyEdges: Cytoscape.EdgeDefinition[] = [];
      const processedPairs = new Set<string>();

      try {
        for (let i = 0; i < nodes.length; i++) {
          const teammates = nodes[i].data.teammates;
          if (!teammates) continue;
          
          Object.entries(teammates).forEach(([teammate, value]) => {
            let targetNode = nodes.find(node => node.data.species === teammate);
            if (!targetNode) return;
            
            // Create a unique pair identifier (sorted to avoid duplicates)
            const pairId = [nodes[i].data.species, teammate].sort().join('-');
            
            if (processedPairs.has(pairId)) return;
            processedPairs.add(pairId);
            
            const weight1 = Number(value) * 100;
            const targetTeammates = targetNode.data.teammates;
            const weight2 = targetTeammates?.[nodes[i].data.species] 
              ? Number(targetTeammates[nodes[i].data.species]) * 100 
              : 0;
            
            // Use minimum - represents mutual dependency
            const mutualWeight = (weight1 + weight2) / 2;
            const threshold = 10;
            
            if (mutualWeight > threshold) {
              synergyEdges.push({
                group: 'edges',
                data: {
                  id: `synergy-${pairId}`,
                  source: nodes[i].data.id as string,
                  target: targetNode.data.id as string,
                  weight: mutualWeight,
                  label: `${mutualWeight.toFixed(1)}%`,
                  type: 'synergy'
                }
              });
            }
          });
        }
      } catch (synergyErr) {
        debug("Error creating synergy edges:", synergyErr);
      }
      
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
      // Start with all nodes and regular edges
      const elements: ElementsDefinition = { nodes, edges };

      try {
        const cyInstance = Cytoscape({
          container: cyRef.current,
          elements: elements,
          style: styles,
          wheelSensitivity: 0.3,
        });
        
        // Store synergy edges on the cy instance for later use
        (cyInstance as any)._synergyEdges = synergyEdges;
        (cyInstance as any)._regularEdges = edges;
        setCy(cyInstance);
        
        // Create and configure the layout manager
        const manager = new LayoutManager(cyInstance);
        
        // Register all layouts with their transformations
        debug("Registering layouts");
// FCOSE LAYOUT REGISTRATION - Uses hover with threshold
// Replace the fcose layout registration in ImprovedTestGraph.tsx

manager.registerLayout(
  'fcose', 
  layouts.fcose,
  (cy) => {
    cy.elements().removeClass('hidden centered tile');
    cy.nodes().removeClass('hidden centered tile');
    
    // Remove all existing edges
    cy.edges().remove();
    
    // Add synergy edges for fcose layout (for physics only)
    const synergyEdges = (cy as any)._synergyEdges || [];
    cy.add(synergyEdges);
    
    // Add ALL regular directional edges (they'll be filtered by hover threshold)
    const regularEdges = (cy as any)._regularEdges || [];
    cy.add(regularEdges);
    
    // Setup hover behavior for fcose (with threshold)
    setupFcoseHoverBehavior(cy);
  },
  'Force-directed layout showing all Pokémon',
);
        
        manager.registerLayout(
          'grid', 
          layouts.grid,
          (cy) => {
            cy.elements().removeClass('hidden centered');
            cy.nodes().addClass('tile');
            cy.edges().remove();
            
            // Cleanup hover behavior when leaving fcose
            cleanupFcoseHoverBehavior(cy);
          },
          'Grid view showing all Pokémon as tiles',
        );
        
        manager.registerLayout(
          'circle', 
          layouts.circle,
          (cy) => {
            cy.nodes().removeClass('hidden centered tile');
            // Remove synergy edges, restore regular edges
            cy.edges().remove();
            const regularEdges = (cy as any)._regularEdges || [];
            cy.add(regularEdges);
            
            cy.edges().removeClass('hidden');
            
            // Cleanup hover behavior when leaving fcose
            cleanupFcoseHoverBehavior(cy);
          },
          'Circle layout showing relationships between all Pokémon',
        );
        
        manager.registerLayout(
          'concentric',
          layouts.concentric,
          (cy) => {
            cy.nodes().removeClass('hidden centered tile');
            // Remove synergy edges, restore regular edges
            cy.edges().remove();
            const regularEdges = (cy as any)._regularEdges || [];
            cy.add(regularEdges);
            
            cy.edges().removeClass('hidden');
            
            // Cleanup hover behavior when leaving fcose
            cleanupFcoseHoverBehavior(cy);
          },
          'Concentric layout with most used Pokémon in the center',
        );
        
// LAYOUT REGISTRATION FIXES - Replace each layout registration in ImprovedTestGraph.tsx

// FCOSE LAYOUT - Show only edges above 10% threshold
manager.registerLayout(
  'fcose', 
  layouts.fcose,
  (cy) => {
    cy.elements().removeClass('hidden centered tile');
    cy.nodes().removeClass('hidden centered tile');
    
    // Remove all existing edges
    cy.edges().remove();
    
    // Add synergy edges for fcose layout
    const synergyEdges = (cy as any)._synergyEdges || [];
    cy.add(synergyEdges);
    
    // Add regular edges but filter by threshold (10%)
    const regularEdges = (cy as any)._regularEdges || [];
    const filteredEdges = regularEdges.filter((edge: any) => edge.data.weight >= 10);
    cy.add(filteredEdges);
    
    // Setup hover behavior for fcose
    setupFcoseHoverBehavior(cy);
  },
  'Force-directed layout showing all Pokémon',
);

// GRID LAYOUT - No edges
manager.registerLayout(
  'grid', 
  layouts.grid,
  (cy) => {
    cy.elements().removeClass('hidden centered');
    cy.nodes().addClass('tile');
    cy.edges().remove();
    
    // Hide labels in grid view
    cy.nodes().style('label', '');
    
    // Cleanup hover behavior when leaving fcose
    cleanupFcoseHoverBehavior(cy);
  },
  'Grid view showing all Pokémon as tiles',
);

// CIRCLE LAYOUT - Show only edges above 10% threshold
manager.registerLayout(
  'circle', 
  layouts.circle,
  (cy) => {
    cy.nodes().removeClass('hidden centered tile');
    
    // Remove synergy edges, restore regular edges with threshold
    cy.edges().remove();
    const regularEdges = (cy as any)._regularEdges || [];
    const filteredEdges = regularEdges.filter((edge: any) => edge.data.weight >= 10);
    cy.add(filteredEdges);
    
    cy.edges().removeClass('hidden');
    
    // Cleanup hover behavior when leaving fcose
    cleanupFcoseHoverBehavior(cy);
  },
  'Circle layout showing relationships between all Pokémon',
);

// CONCENTRIC LAYOUT - Show only edges above 10% threshold
manager.registerLayout(
  'concentric',
  layouts.concentric,
  (cy) => {
    cy.nodes().removeClass('hidden centered tile');
    
    // Remove synergy edges, restore regular edges with threshold
    cy.edges().remove();
    const regularEdges = (cy as any)._regularEdges || [];
    const filteredEdges = regularEdges.filter((edge: any) => edge.data.weight >= 10);
    cy.add(filteredEdges);
    
    cy.edges().removeClass('hidden');
    
    // Cleanup hover behavior when leaving fcose
    cleanupFcoseHoverBehavior(cy);
  },
  'Concentric layout with most used Pokémon in the center',
);

// FOCUS LAYOUT - Show ALL edges (no threshold) from focused node
// COMPLETE FOCUS LAYOUT FIX
// Replace the entire focus layout registration in ImprovedTestGraph.tsx

manager.registerLayout(
  'focus',
  layouts.focus || layouts.circle,
  (cy) => {
    debug("Focus layout transformation starting");
    
    // Remove all classes first
    cy.nodes().removeClass('hidden centered tile');
    
    // Remove ALL edges first
    cy.edges().remove();
    
    // Add ALL regular edges back (no filtering)
    const regularEdges = (cy as any)._regularEdges || [];
    cy.add(regularEdges);
    
    // IMPORTANT: Make sure all edges are visible and have labels in focus mode
    cy.edges().style({
      'opacity': '1',
      'label': (ele: any) => ele.data('label')
    });
    
    // Make sure all nodes have visible labels
    cy.nodes().style({
      'opacity': '1',
      'label': (ele: any) => ele.data('label'),
      'text-opacity': '1'
    });
    
    // If there's a selected node, show it and its teammates
    if (manager.selectedNode) {
      const focusedNode = manager.selectedNode;
      const focusedSpecies = focusedNode.data('species');
      
      debug(`Focus mode: Processing ${focusedSpecies}`);
      
      // Get teammates data directly from the node
      const teammatesData = focusedNode.data('teammates');
      debug(`Teammates data:`, teammatesData);
      
      if (!teammatesData) {
        debug("WARNING: No teammates data found on node!");
      }
      
      // Find all nodes that are in the teammates list (NO THRESHOLD)
      const teammateNodes = cy.nodes().filter((node: any) => {
        const species = node.data('species');
        // Check if this species is in the teammates data
        const isTeammate = species !== focusedSpecies && teammatesData && teammatesData[species];
        if (isTeammate) {
          debug(`Found teammate: ${species} with value ${teammatesData[species]}`);
        }
        return isTeammate;
      });
      
      debug(`Found ${teammateNodes.length} teammate nodes out of ${cy.nodes().length} total nodes`);
      
      // Hide all nodes EXCEPT focused node and its teammates
      cy.nodes().not(focusedNode).not(teammateNodes).addClass('hidden');
      
      // For edges: show ALL edges FROM focused node TO teammates (no threshold, no hover)
      let visibleEdgeCount = 0;
      cy.edges().forEach((edge: any) => {
        const sourceId = edge.source().id();
        
        // Show edge if it goes from focused node to a teammate
        if (sourceId === focusedNode.id() && teammateNodes.contains(edge.target())) {
          edge.removeClass('hidden');
          edge.style('opacity', '1');  // Force visible
          visibleEdgeCount++;
        } else {
          edge.addClass('hidden');
        }
      });
      
      debug(`Showing ${visibleEdgeCount} edges in focus mode`);
      
      // Add centered class to focused node (makes it a star)
      focusedNode.addClass('centered');
      
      debug(`Focus mode: showing ${focusedSpecies} with ${teammateNodes.length} teammates and ${visibleEdgeCount} edges`);
    } else {
      debug("No selected node in focus mode");
    }
    
    // DO NOT cleanup hover behavior - focus mode doesn't use it
    // cleanupFcoseHoverBehavior(cy);  // ← REMOVE THIS LINE
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
    
    // Always switch to focus mode when clicking a node (from any layout)
    debug("Switching to focus mode for clicked node");
    
    // Update selected node immediately
    setSelectedNode(clickedNode.data('species'));
    setShowNodeDetails(true);
    
    // Apply focus layout
    setTimeout(() => {
      debug("Applying focusOnNode after UI state change");
      layoutManager.focusOnNode(clickedNode);
    }, 0);
  };
      // Handle background click to exit focus mode
const handleBackgroundClick = (event: Cytoscape.EventObject) => {
  // Only handle clicks directly on the background (canvas)
  if (event.target === cy) {
    // Exit focus mode if we're in it - return to the last non-focus layout
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