// LayoutControlsWrapper.tsx
import React, { useMemo } from 'react';
import LayoutManager from '../graphtest/LayoutManager';
import LayoutControls from '../graphtest/LayoutControls';

interface LayoutControlsWrapperProps {
  layoutManager: LayoutManager | null;
}

// Separate component to properly handle memoization with conditional rendering
const LayoutControlsWrapper: React.FC<LayoutControlsWrapperProps> = ({ layoutManager }) => {
  // If no layout manager, render nothing
  if (!layoutManager) return null;
  
  // Use useMemo when the component is definitely rendered
  const memoizedControls = useMemo(() => {
    return <LayoutControls layoutManager={layoutManager} />;
  }, [layoutManager, layoutManager.currentLayout]);
  
  return memoizedControls;
};

export default LayoutControlsWrapper;