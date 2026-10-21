import { Core, NodeSingular } from 'cytoscape';

interface Layout {
  name: string;
  options: any;
  transform?: (cy: Core, selectedNode?: NodeSingular | null) => void;
  description?: string;
  skipFit?: boolean;
}

type LayoutChangeCallback = (layoutName: string, selectedNode: NodeSingular | null) => void;

class LayoutManager {
  cy: Core;
  layouts: Record<string, Layout>;
  currentLayout: string | null;
  layoutHistory: string[];
  selectedNode: NodeSingular | null;
  private _fitTimeout: ReturnType<typeof setTimeout> | null = null;
  private _listeners: LayoutChangeCallback[] = [];
  weightAdjuster: ((focusedSpecies: string, targetSpecies: string, defaultWeight: number) => number) | null = null;
  teamSpecies: string[] = [];

  constructor(cy: Core) {
    this.cy = cy;
    this.layouts = {};
    this.currentLayout = null;
    this.layoutHistory = [];
    this.selectedNode = null;
  }

  onChange(callback: LayoutChangeCallback): () => void {
    this._listeners.push(callback);
    return () => {
      this._listeners = this._listeners.filter(cb => cb !== callback);
    };
  }

  private _emit() {
    this._listeners.forEach(cb => cb(this.currentLayout!, this.selectedNode));
  }

  registerLayout(
    name: string,
    options: any,
    transform?: (cy: Core, selectedNode?: NodeSingular | null) => void,
    description?: string,
    skipFit?: boolean,
  ) {
    this.layouts[name] = { name, options, transform, description, skipFit };
    return this;
  }

  getLayouts() {
    return Object.values(this.layouts);
  }

  applyLayout(name: string, selectedNode: NodeSingular | null = null) {
    if (!this.layouts[name]) {
      console.error(`Layout "${name}" not found`);
      return false;
    }

    // Focus has custom positioning — delegate to focusOnNode
    if (name === 'focus') {
      const node = selectedNode ?? this.selectedNode;
      if (node) return this.focusOnNode(node);
      return false;
    }

    // Team has custom positioning — delegate to _applyTeamPositions
    if (name === 'team') {
      if (this.currentLayout && this.currentLayout !== 'team') {
        this.layoutHistory.push(this.currentLayout);
      }
      this.currentLayout = 'team';
      this.selectedNode = null;
      const layout = this.layouts['team'];
      if (layout?.transform) layout.transform(this.cy, null);
      this._applyTeamPositions();
      this._emit();
      return true;
    }

    if (this.currentLayout && this.currentLayout !== name) {
      this.layoutHistory.push(this.currentLayout);
    }

    this.currentLayout = name;
    this.selectedNode = null;

    const layout = this.layouts[name];
    if (layout.transform) layout.transform(this.cy, null);

    const layoutInstance = this.cy.layout(layout.options);
    layoutInstance.run();

    const hasAnimation =
      layout.options.animate &&
      layout.options.animate !== false;

    if (!layout.skipFit) {
      if (this._fitTimeout) clearTimeout(this._fitTimeout);
      this._fitTimeout = setTimeout(() => {
        this.cy.animate({
          fit: { eles: this.cy.elements(':visible'), padding: 50 },
          duration: 500,
          easing: 'ease-out-cubic',
        });
      }, hasAnimation ? 500 : 50);
    }

    this._emit();
    return true;
  }

  private _applyTeamPositions() {
    const cy = this.cy;
    const teamNodes = cy.nodes('.team').not('.hidden');
    const mateNodes = cy.nodes(':visible').not('.team');

    const n = teamNodes.length;
    if (n === 0) return;

    // n-gon radius scales with team size (single member stays at origin)
    const teamRadius = n === 1 ? 0 : Math.max(160, 80 * n);

    // Position team members in a regular polygon
    teamNodes.forEach((node: NodeSingular, i: number) => {
      const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
      node.animate({
        position: {
          x: teamRadius * Math.cos(angle),
          y: teamRadius * Math.sin(angle),
        },
        duration: 450,
        easing: 'ease-out-cubic',
      } as any);
    });

    // Sort outer-ring mates by joint score (stored by the transform)
    const mates: Array<{ node: NodeSingular; score: number }> = [];
    mateNodes.forEach((node: NodeSingular) => {
      mates.push({ node, score: (node.data('teamScore') as number) ?? 0 });
    });
    mates.sort((a, b) => b.score - a.score);

    if (this._fitTimeout) clearTimeout(this._fitTimeout);

    if (mates.length === 0) {
      this._fitTimeout = setTimeout(() => {
        cy.animate({ fit: { eles: cy.elements(':visible'), padding: 80 }, duration: 350, easing: 'ease-out-cubic' });
      }, 480);
      return;
    }

    const maxScore = mates[0].score;
    const minScore = mates[mates.length - 1].score;
    const spread   = maxScore - minScore || 1;
    const innerR   = teamRadius + 250;
    const outerR   = innerR + 500;
    const count    = mates.length;

    mates.forEach(({ node, score }, i) => {
      const angle  = (i / count) * 2 * Math.PI - Math.PI / 2;
      const t      = (score - minScore) / spread;           // 0=lowest, 1=highest
      const radius = outerR - (outerR - innerR) * t;        // high score → close in

      node.animate({
        position: {
          x: radius * Math.cos(angle),
          y: radius * Math.sin(angle),
        },
        duration: 450,
        easing: 'ease-out-cubic',
      } as any);
    });

    this._fitTimeout = setTimeout(() => {
      cy.animate({ fit: { eles: cy.elements(':visible'), padding: 80 }, duration: 350, easing: 'ease-out-cubic' });
    }, 480);
  }

  focusOnNode(node: NodeSingular) {
    // Toggle: clicking the same focused node returns to grid
    if (this.currentLayout === 'focus' && this.selectedNode?.same(node)) {
      this.applyLayout('grid');
      return true;
    }

    if (this.currentLayout !== 'focus') {
      this.layoutHistory.push(this.currentLayout as string);
    }

    this.selectedNode = node;

    // Run the registered focus transform (hides/shows nodes and edges)
    if (this.layouts['focus']?.transform) {
      this.layouts['focus'].transform(this.cy, node);
    }

    // Variable-radius positioning: synergy weight determines distance from centre.
    // High weight (common teammate) → close; low weight → far.
    // All model-coordinate radii so the subsequent fit() scales correctly.
    const visibleEdges = node.outgoers('edge').not('.hidden');
    const teammates: Array<{ node: NodeSingular; weight: number }> = [];
    visibleEdges.forEach((edge: any) => {
      const rawWeight = edge.data('weight') as number;
      const focusedSpecies = node.data('species') as string;
      const targetSpecies  = (edge.target() as NodeSingular).data('species') as string;
      const weight = this.weightAdjuster
        ? this.weightAdjuster(focusedSpecies, targetSpecies, rawWeight)
        : rawWeight;
      teammates.push({ node: edge.target() as NodeSingular, weight });
    });
    teammates.sort((a, b) => b.weight - a.weight);

    // Place centre node at origin; fit() will recentre everything afterward
    node.position({ x: 0, y: 0 });

    if (teammates.length > 0) {
      const maxW     = teammates[0].weight;
      const minW     = teammates[teammates.length - 1].weight;
      const spread   = maxW - minW || 1;   // avoid divide-by-zero
      const minR     = 320;                // closest teammate (highest synergy)
      const maxR     = 850;                // farthest teammate (lowest synergy)
      const count    = teammates.length;

      teammates.forEach(({ node: tNode, weight }, i) => {
        const angle  = (i / count) * 2 * Math.PI - Math.PI / 2;
        const t      = (weight - minW) / spread;          // 0 = lowest, 1 = highest
        const radius = maxR - (maxR - minR) * t;          // high synergy → small radius

        tNode.animate({
          position: {
            x: radius * Math.cos(angle),
            y: radius * Math.sin(angle),
          },
          duration: 450,
          easing: 'ease-out-cubic',
        } as any);
      });

      if (this._fitTimeout) clearTimeout(this._fitTimeout);
      this._fitTimeout = setTimeout(() => {
        this.cy.animate({
          fit: { eles: this.cy.elements(':visible'), padding: 80 },
          duration: 350,
          easing: 'ease-out-cubic',
        });
      }, 480);
    } else {
      this.cy.fit(node, 200);
    }

    this.currentLayout = 'focus';
    this._emit();
    return true;
  }

  previousLayout() {
    if (this.layoutHistory.length > 0) {
      const prev = this.layoutHistory.pop() as string;
      this.applyLayout(prev);
      return true;
    }
    return false;
  }

  reset() {
    this.cy.elements().removeClass('hidden centered tile');
    this.layoutHistory = [];
    this.selectedNode = null;
    this.applyLayout('grid');
  }
}

export default LayoutManager;
