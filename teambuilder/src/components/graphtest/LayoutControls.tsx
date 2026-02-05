// Optimized LayoutControls.tsx with Focus button
import React, { useState, useEffect, memo } from 'react';
import LayoutManager from './LayoutManager';
import { Button } from "@/components/ui/button";
import { 
  Network, 
  Grid, 
  Circle, 
  Target, 
  Undo,
  Focus
} from "lucide-react";

interface LayoutControlsProps {
  layoutManager: LayoutManager | null;
}

// Using memo to prevent unnecessary re-renders
const LayoutControls: React.FC<LayoutControlsProps> = memo(({ layoutManager }) => {
  const [currentLayout, setCurrentLayout] = useState<string | null>(null);
  const [hasSelectedNode, setHasSelectedNode] = useState<boolean>(false);
  
  useEffect(() => {
    if (layoutManager) {
      setCurrentLayout(layoutManager.currentLayout);
      setHasSelectedNode(!!layoutManager.selectedNode);
    }
  }, [layoutManager?.currentLayout, layoutManager?.selectedNode]);
  
  if (!layoutManager) return null;
  
  // Get layouts and filter out the focus layout - it will be a separate button
  const layouts = layoutManager.getLayouts()
    .filter(layout => layout.name !== 'focus');
  
  // Get the appropriate icon for each layout
  const getLayoutIcon = (name: string) => {
    switch (name) {
      case 'fcose':
        return <Network className="h-4 w-4 mr-2" />;
      case 'grid':
        return <Grid className="h-4 w-4 mr-2" />;
      case 'circle':
        return <Circle className="h-4 w-4 mr-2" />;
      case 'concentric':
        return <Target className="h-4 w-4 mr-2" />;
      case 'focus':
        return <Focus className="h-4 w-4 mr-2" />;
      default:
        return null;
    }
  };
  
  const handleLayoutChange = (layoutName: string) => {
    if (layoutManager) {
      layoutManager.applyLayout(layoutName);
      setCurrentLayout(layoutName);
    }
  };
  
  const handleFocusLayout = () => {
    if (layoutManager && layoutManager.selectedNode) {
      layoutManager.applyLayout('focus', layoutManager.selectedNode);
      setCurrentLayout('focus');
    }
  };
  
  const handleBack = () => {
    if (layoutManager) {
      layoutManager.previousLayout();
      setCurrentLayout(layoutManager.currentLayout);
    }
  };
  
  return (
    <div className="bg-white/80 backdrop-blur-sm border border-gray-200 shadow-sm rounded-lg">
      <div className="p-4">
        <div className="flex flex-wrap justify-center gap-2">
          {layouts.map((layout) => (
            <Button
              key={layout.name}
              variant={currentLayout === layout.name ? "default" : "outline"}
              size="sm"
              onClick={() => handleLayoutChange(layout.name)}
              title={layout.description || layout.name}
              className="min-w-[120px]"
            >
              {getLayoutIcon(layout.name)}
              {layout.name}
            </Button>
          ))}
          
          {/* Focus button - only enabled when a node is selected */}
          <Button
            variant={currentLayout === 'focus' ? "default" : "outline"}
            size="sm"
            onClick={handleFocusLayout}
            title={hasSelectedNode 
              ? "Focus view showing selected Pokémon and its common teammates" 
              : "Click a Pokémon to enable focus view"}
            disabled={!hasSelectedNode}
            className="min-w-[120px]"
          >
            <Focus className="h-4 w-4 mr-2" />
            focus
          </Button>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleBack}
            title="Go back to previous layout"
            disabled={layoutManager.layoutHistory.length === 0}
            className="min-w-[120px]"
          >
            <Undo className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
      </div>
    </div>
  );
});

export default memo(LayoutControls);