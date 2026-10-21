import React from 'react';
import LayoutManager from './LayoutManager';
import { Network, Grid, Circle, Target, BarChart2 } from 'lucide-react';

interface Props {
  layoutManager: LayoutManager;
  currentLayout: string;
}

const icons: Record<string, React.ReactNode> = {
  grid:       <Grid      className="h-3.5 w-3.5" />,
  list:       <BarChart2 className="h-3.5 w-3.5" />,
  fcose:      <Network   className="h-3.5 w-3.5" />,
  circle:     <Circle    className="h-3.5 w-3.5" />,
  concentric: <Target    className="h-3.5 w-3.5" />,
};

const labels: Record<string, string> = {
  grid:       'Grid',
  list:       'List',
  fcose:      'Network',
  circle:     'Circle',
  concentric: 'Concentric',
};

const LayoutControls: React.FC<Props> = ({ layoutManager, currentLayout }) => {
  const layouts = layoutManager.getLayouts().filter(l => !['focus', 'team'].includes(l.name));

  return (
    <>
      {layouts.map(layout => (
        <button
          key={layout.name}
          onClick={() => layoutManager.applyLayout(layout.name)}
          title={layout.description ?? layout.name}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
            currentLayout === layout.name
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-white/70 hover:text-white hover:bg-white/10'
          }`}
        >
          {icons[layout.name] ?? null}
          <span>{labels[layout.name] ?? layout.name}</span>
        </button>
      ))}
    </>
  );
};

export default LayoutControls;
