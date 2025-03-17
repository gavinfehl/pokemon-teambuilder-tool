// LayoutControls.tsx
import React, { useState, useEffect } from 'react';
import LayoutManager from './LayoutManager';

interface LayoutControlsProps {
  layoutManager: LayoutManager | null;
}

const LayoutControls: React.FC<LayoutControlsProps> = ({ layoutManager }) => {
  const [currentLayout, setCurrentLayout] = useState<string | null>(null);
  
  useEffect(() => {
    if (layoutManager) {
      // Update when layout changes
      setCurrentLayout(layoutManager.currentLayout);
    }
  }, [layoutManager?.currentLayout]);
  
  if (!layoutManager) return null;
  
  const layouts = layoutManager.getLayouts();
  
  const handleLayoutChange = (layoutName: string) => {
    if (layoutManager) {
      layoutManager.applyLayout(layoutName);
      setCurrentLayout(layoutName);
    }
  };
  
  const handleBack = () => {
    if (layoutManager) {
      layoutManager.previousLayout();
      setCurrentLayout(layoutManager.currentLayout);
    }
  };
  
  const handleReset = () => {
    if (layoutManager) {
      layoutManager.reset();
      setCurrentLayout(layoutManager.currentLayout);
    }
  };
  
  return (
    <div className="layout-controls">
      <div className="layout-buttons">
        {layouts.map((layout) => (
          <button
            key={layout.name}
            className={`layout-button ${currentLayout === layout.name ? 'active' : ''}`}
            onClick={() => handleLayoutChange(layout.name)}
            title={layout.description || layout.name}
          >
            {layout.icon ? (
              <span className="layout-icon">{layout.icon}</span>
            ) : (
              <span>{layout.name}</span>
            )}
          </button>
        ))}
        
        <button 
          className="layout-button history-button" 
          onClick={handleBack}
          title="Go back to previous layout"
          disabled={layoutManager.layoutHistory.length === 0}
        >
          ↩ Back
        </button>
        
        <button 
          className="layout-button reset-button" 
          onClick={handleReset}
          title="Reset to initial layout"
        >
          ⟳ Reset
        </button>
      </div>
      
      <div className="layout-info">
        <p>Current Layout: <strong>{currentLayout}</strong></p>
        {currentLayout && layoutManager.layouts[currentLayout]?.description && (
          <p className="layout-description">
            {layoutManager.layouts[currentLayout].description}
          </p>
        )}
      </div>
      
      <style jsx>{`
        .layout-controls {
          background: rgba(255, 255, 255, 0.8);
          border-radius: 8px;
          padding: 10px;
          margin-bottom: 10px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        
        .layout-buttons {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 10px;
        }
        
        .layout-button {
          padding: 8px 12px;
          border: none;
          border-radius: 4px;
          background: #f0f0f0;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s ease;
        }
        
        .layout-button:hover {
          background: #e0e0e0;
        }
        
        .layout-button.active {
          background: #333;
          color: white;
        }
        
        .history-button, .reset-button {
          margin-left: auto;
        }
        
        .history-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .layout-info {
          font-size: 14px;
        }
        
        .layout-description {
          color: #666;
          font-style: italic;
        }
      `}</style>
    </div>
  );
};

export default LayoutControls;