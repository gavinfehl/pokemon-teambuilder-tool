'use client';
import React, { useEffect, useRef, useState } from 'react';
import Cytoscape, { ElementDefinition } from 'cytoscape';
import fcose from 'cytoscape-fcose';
import Pokemon from '@/classes/Pokemon';
import { PokemonTier } from '@/classes/PokemonSet';
import LayoutManager from './LayoutManager';
import LayoutControls from './LayoutControls';
import layouts from './Layouts';
import styles from './Styles';
import { RotateCcw, X, Star, Users } from 'lucide-react';

Cytoscape.use(fcose);

// ─── Spritesheet icon
function SpriteIcon({ mon, scale = 2 }: { mon: Pokemon; scale?: number }) {
  const coords = mon.displayinfo?.spritesheetCoords;
  if (!coords) return <div style={{ width: 40 * scale, height: 30 * scale }} />;
  return (
    <div
      style={{
        width:  40 * scale,                                                         // sprite width
        height: 30 * scale,                                                         // sprite height
        imageRendering: 'pixelated',                                                // not blurry when scaled up
        backgroundImage: 'url(/sprites/pokemonicons-sheet.png)',                    // spritesheet
        backgroundSize: `${480 * scale}px ${3990 * scale}px`,                       // spritesheet resolution * scale
        backgroundPosition: `${coords[0] * scale}px ${coords[1] * scale}px`,        // sprite coords * scale
        backgroundRepeat: 'no-repeat',                                              // don't tile
        flexShrink: 0,
      }}
    />
  );
}

interface Props {
  team: PokemonTier;    // Structure containing all Pokémon and their usage data for the selected tier
}

// ─── Grid configuration ──────────────────────────────────────────────────────
const GRID_COLS   = 8;   // mons per row in grid view
const GRID_MARGIN = 12;  // px gap around the grid inside the viewport

// Edges below this teammate % are hidden in non-hover layouts
const EDGE_THRESHOLD = 10;
// Synergy edges (fcose physics) only included when lift ≥ this value.
// lift = co-occurrence / target_usage — >1 means genuine synergy above chance.
const LIFT_THRESHOLD = 1.2;

// ─── Hover behaviour (fcose only) ────────────────────────────────────────────

function setupHover(cy: Cytoscape.Core) {
  cy.edges('[!type]').style('opacity', 0);
  cy.nodes().style({ opacity: 1, label: '', 'text-opacity': 0 });
  cy.nodes().off('mouseover mouseout');

  cy.nodes().on('mouseover', (e: any) => {
    const node = e.target;
    node.style({ label: node.data('label'), 'text-opacity': 1 });
    cy.nodes().not(node).style('opacity', 0.1);

    node.connectedEdges('[!type]').forEach((edge: any) => {
      if (edge.source().id() !== node.id()) return;
      const w = edge.data('weight');
      if (w < EDGE_THRESHOLD) return;
      edge.style({ opacity: 1, label: edge.data('label') });
      edge.target().style({
        opacity: Math.min(Math.max(w / 100 + 0.25, 0.25), 1),
        label: edge.target().data('label'),
        'text-opacity': 1,
      });
    });
  });

  cy.nodes().on('mouseout', () => {
    cy.nodes().style({ opacity: 1, label: '', 'text-opacity': 0 });
    cy.edges('[!type]').style({ opacity: 0, label: '' });
  });
}

function teardownHover(cy: Cytoscape.Core) {
  cy.nodes().off('mouseover mouseout');
  // Remove inline style overrides so CSS class rules take effect cleanly
  cy.nodes().removeStyle('opacity label text-opacity font-size text-margin-y');
  cy.edges().removeStyle('opacity label');
}

// ─── Grid vertical-scroll lock ───────────────────────────────────────────────

function setupGridScroll(cy: Cytoscape.Core) {
  cy.userPanningEnabled(false);
  cy.userZoomingEnabled(false);

  const DOCK_H    = 70; // height of the floating dock — keeps last row visible
  const container = cy.container();
  if (!container) return;

  const refit = (scrollRatio = 0) => {
    const visNodes = cy.nodes(':visible');
    if (!visNodes.length) return { lockedX: 0, topY: 0, bottomY: 0 };
    const bb      = visNodes.boundingBox();
    const zoom    = (cy.width() - GRID_MARGIN * 2) / bb.w;
    const lockedX = -bb.x1 * zoom + GRID_MARGIN;
    const topY    = -bb.y1 * zoom + GRID_MARGIN;
    const bottomY = (cy.height() - DOCK_H - GRID_MARGIN) - (bb.y1 + bb.h) * zoom;
    const scrollRange = Math.max(0, topY - bottomY);
    const newY    = topY - scrollRatio * scrollRange;
    cy.zoom(zoom);
    cy.pan({ x: lockedX, y: newY });
    return { lockedX, topY, bottomY };
  };

  let state = refit();

  // ResizeObserver fires immediately on any container size change
  const ro = new ResizeObserver(() => {
    // Wait one frame so cy.width()/cy.height() reflect the new dimensions
    requestAnimationFrame(() => {
      const scrollRange = Math.max(0, state.topY - state.bottomY);
      const ratio = scrollRange > 0 ? (state.topY - cy.pan().y) / scrollRange : 0;
      state = refit(ratio);
    });
  });
  ro.observe(container);
  (cy as any)._gridResizeObserver = ro;

  let adjusting = false;
  cy.on('pan.gridscroll', () => {
    if (adjusting) return;
    const p    = cy.pan();
    const newY = Math.min(state.topY, Math.max(state.bottomY, p.y));
    if (p.x !== state.lockedX || p.y !== newY) {
      adjusting = true;
      cy.pan({ x: state.lockedX, y: newY });
      adjusting = false;
    }
  });

  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    const newY = Math.min(state.topY, Math.max(state.bottomY, cy.pan().y - e.deltaY));
    cy.pan({ x: state.lockedX, y: newY });
  };
  (cy as any)._gridWheelHandler = onWheel;
  container.addEventListener('wheel', onWheel, { passive: false });
}

function teardownGridScroll(cy: Cytoscape.Core) {
  cy.userPanningEnabled(true);
  cy.userZoomingEnabled(true);
  cy.off('pan.gridscroll');
  if ((cy as any)._gridResizeObserver) {
    (cy as any)._gridResizeObserver.disconnect();
    delete (cy as any)._gridResizeObserver;
  }
  const container = cy.container();
  if (container && (cy as any)._gridWheelHandler) {
    container.removeEventListener('wheel', (cy as any)._gridWheelHandler);
    delete (cy as any)._gridWheelHandler;
  }
}

// ─── Post-layout hard collision pass ─────────────────────────────────────────
function resolveOverlaps(cy: Cytoscape.Core, padding = 20) {
  const nodes = cy.nodes(':visible').toArray() as Cytoscape.NodeSingular[];
  const pos   = nodes.map(n => ({ ...n.position() }));
  const radii = nodes.map(n => Math.max(n.width(), n.height()) / 2);

  for (let pass = 0; pass < 300; pass++) {
    let moved = false;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const minDist = radii[i] + radii[j] + padding;
        const dx = pos[j].x - pos[i].x;
        const dy = pos[j].y - pos[i].y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.001;
        if (dist < minDist) {
          const push = (minDist - dist) * 0.5;
          const nx = dx / dist, ny = dy / dist;
          pos[i].x -= nx * push;  pos[i].y -= ny * push;
          pos[j].x += nx * push;  pos[j].y += ny * push;
          moved = true;
        }
      }
    }
    if (!moved) break;
  }

  nodes.forEach((node, i) =>
    node.animate({ position: pos[i], duration: 500, easing: 'ease-out-cubic' } as any)
  );
}

function setupGridHover(cy: Cytoscape.Core) {
  cy.nodes().off('mouseover mouseout');

  cy.nodes().on('mouseover', (e: any) => {
    e.target.style({
      label: e.target.data('label'),
      'text-opacity': 1,
      'font-size': '22px',
      'text-margin-y': '-20px',
    });
  });

  cy.nodes().on('mouseout', (e: any) => {
    e.target.removeStyle('label text-opacity font-size text-margin-y');
  });
}

// ─── Component ───────────────────────────────────────────────────────────────

const ImprovedTestGraph: React.FC<Props> = ({ team }) => {
  const cyContainerRef = useRef<HTMLDivElement>(null);
  const [cy, setCy]                         = useState<Cytoscape.Core | null>(null);
  const [layoutManager, setLayoutManager]   = useState<LayoutManager | null>(null);
  const [currentLayout, setCurrentLayout]   = useState<string>('grid');
  const [selectedSpecies, setSelectedSpecies] = useState<string | null>(null);
  const [isLoading, setIsLoading]           = useState(true);
  const [graphStats, setGraphStats]         = useState({ nodeCount: 0, edgeCount: 0 });
  const [errorMsg, setErrorMsg]             = useState<string | null>(null);
  const [myTeam, setMyTeam]                 = useState<string[]>([]);

  // ── Escape to exit focus ──────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && layoutManager?.currentLayout === 'focus') {
        layoutManager.applyLayout('grid');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [layoutManager]);

  // ── Sync myTeam → Cytoscape classes + weightAdjuster ────────────────────
  useEffect(() => {
    if (!cy || !layoutManager) return;

    // Update gold-ring class on every node
    cy.nodes().forEach((node: any) => {
      node.toggleClass('team', myTeam.includes(node.data('species')));
    });

    // Keep teamSpecies in sync so the team layout can use it
    layoutManager.teamSpecies = myTeam;

    // Refresh team layout live when team composition changes
    if (layoutManager.currentLayout === 'team' && myTeam.length >= 2) {
      layoutManager.applyLayout('team');
    } else if (layoutManager.currentLayout === 'team' && myTeam.length < 2) {
      layoutManager.applyLayout('grid');
    }

    // With <2 team members there's nothing to adjust
    if (myTeam.length < 2) {
      layoutManager.weightAdjuster = null;
      return;
    }

    // Build a lookup: species → teammates map (decimal values, 0-1)
    const teamData = myTeam.map(species => ({
      species,
      teammates: (team.pokemons.find((p: Pokemon) => p.species === species)?.usage?.teammates ?? {}) as Record<string, number>,
    }));

    // Joint synergy = arithmetic mean of (focused synergy, other-team-member synergies)
    // High score → teammate fits the whole team well, not just the focused mon
    layoutManager.weightAdjuster = (focusedSpecies, targetSpecies, defaultWeight) => {
      const others = teamData.filter(m => m.species !== focusedSpecies);
      if (others.length === 0) return defaultWeight;
      const teamScores = others.map(m => (m.teammates[targetSpecies] ?? 0) * 100);
      const all = [defaultWeight, ...teamScores];
      return all.reduce((a, b) => a + b, 0) / all.length;
    };
  }, [myTeam, cy, layoutManager, team]);

  // ── Graph initialisation ──────────────────────────────────────────────────
  useEffect(() => {
    if (!cyContainerRef.current || !team?.pokemons?.length) return;

    setIsLoading(true);
    setErrorMsg(null);

    try {
      // Nodes
      const nodes: ElementDefinition[] = team.pokemons.map((mon: Pokemon, i: number) => {
        const realUsage  = mon.usage?.usage?.real ?? 0;
        const size       = realUsage * 500 + 100;
        const sX         = size / 40;
        const sY         = size / 30;
        const gX         = 350 / 40;   // grid scale
        const gY         = 350 / 30;
        const coords     = mon.displayinfo?.spritesheetCoords;

        return {
          group: 'nodes',
          data: {
            id:       mon.info?.natdexnumber ? `poke-${mon.species}-${mon.info.natdexnumber}` : `poke-${i}`,
            species:  mon.species,
            label:    `${mon.species} (${(realUsage * 100).toFixed(1)}%)`,
            teammates: mon.usage?.teammates ?? {},
            size,
            sprite:            'sprites/pokemonicons-sheet.png',
            spriteWidth:       `${480  * sX}px`,
            spriteHeight:      `${3990 * sY}px`,
            spritePositionX:   coords ? `${coords[0] * sX}px` : '0px',
            spritePositionY:   coords ? `${coords[1] * sY}px` : '0px',
            gridSpritePositionX: coords ? `${coords[0] * gX}px` : '0px',
            gridSpritePositionY: coords ? `${coords[1] * gY}px` : '0px',
            colors: [mon.displayinfo?.type1color ?? '#666666', mon.displayinfo?.type2color ?? '#666666'],
            color1: mon.displayinfo?.type1color ?? '#666666',
          },
        };
      });

      // Usage map for lift normalisation: species → real usage rate (0–1)
      const usageMap: Record<string, number> = {};
      for (const mon of team.pokemons) {
        usageMap[mon.species] = mon.usage?.usage?.real ?? 0;
      }

      // Directed teammate edges (with lift = co-occurrence / target_usage)
      const edges: Cytoscape.EdgeDefinition[] = [];
      for (const node of nodes) {
        const teammates = node.data.teammates as Record<string, number>;
        for (const [mate, val] of Object.entries(teammates)) {
          const target = nodes.find(n => n.data.species === mate);
          if (!target) continue;
          const weight = val * 100;
          const targetUsage = usageMap[mate] ?? val;
          const lift = targetUsage > 0 ? val / targetUsage : 1;
          edges.push({
            group: 'edges',
            data: {
              id:     `edge-${node.data.id}-${target.data.id}`,
              source:  node.data.id as string,
              target:  target.data.id as string,
              weight,
              lift,
              label:  `${weight.toFixed(1)}%`,
            },
          });
        }
      }

      // Undirected synergy edges (fcose physics only) — filtered by lift
      const synergyEdges: Cytoscape.EdgeDefinition[] = [];
      const seen = new Set<string>();
      for (const node of nodes) {
        const teammates = node.data.teammates as Record<string, number>;
        for (const [mate, val] of Object.entries(teammates)) {
          const target = nodes.find(n => n.data.species === mate);
          if (!target) continue;
          const pairId = [node.data.species, mate].sort().join('|');
          if (seen.has(pairId)) continue;
          seen.add(pairId);
          const w1 = val * 100;
          const w2 = ((target.data.teammates as any)?.[node.data.species] ?? 0) * 100;
          const mutual = (w1 + w2) / 2;
          const targetUsage = usageMap[mate] ?? 0;
          const sourceUsage = usageMap[node.data.species as string] ?? 0;
          const lift1 = targetUsage > 0 ? val / targetUsage : 1;
          const lift2 = sourceUsage > 0 ? ((target.data.teammates as any)?.[node.data.species] ?? 0) / sourceUsage : 1;
          const avgLift = (lift1 + lift2) / 2;
          if (avgLift >= LIFT_THRESHOLD) {
            synergyEdges.push({
              group: 'edges',
              data: {
                id:     `syn-${pairId}`,
                source:  node.data.id as string,
                target:  target.data.id as string,
                weight:  mutual,
                lift:    avgLift,
                label:  '',
                type:   'synergy',
              },
            });
          }
        }
      }

      setGraphStats({ nodeCount: nodes.length, edgeCount: edges.length });

      if (cy) cy.destroy();

      const cyInstance = Cytoscape({
        container: cyContainerRef.current!,
        elements: { nodes: nodes as Cytoscape.NodeDefinition[], edges },
        style: styles,
        wheelSensitivity: 0.3,
      });

      (cyInstance as any)._synergyEdges = synergyEdges;
      (cyInstance as any)._regularEdges = edges;

      const manager = new LayoutManager(cyInstance);

      const filteredEdges = (cy: Cytoscape.Core) =>
        ((cy as any)._regularEdges ?? []).filter((e: any) => e.data.weight >= EDGE_THRESHOLD);

      manager.registerLayout('grid', { ...layouts.grid, cols: GRID_COLS }, (cy) => {
        cy.elements().removeClass('hidden centered tile');
        cy.nodes().addClass('tile');
        cy.edges().remove();
        teardownHover(cy);
        setupGridHover(cy);
        setTimeout(() => setupGridScroll(cy), 0);
      }, 'Grid', true);

      manager.registerLayout('list', layouts.list, (cy) => {
        teardownGridScroll(cy);
        cy.elements().removeClass('hidden centered tile');
        cy.edges().remove();
        teardownHover(cy);
      }, 'List', true);

      manager.registerLayout('fcose', layouts.fcose, (cy) => {
        teardownGridScroll(cy);
        cy.elements().removeClass('hidden centered tile');
        cy.edges().remove();
        cy.add((cy as any)._synergyEdges ?? []);
        cy.add(filteredEdges(cy));
        setupHover(cy);
        // layoutstop fires after the fcose animation completes
        cy.one('layoutstop', () => {
          if (manager.currentLayout === 'fcose') resolveOverlaps(cy);
        });
      }, 'Network');

      manager.registerLayout('circle', layouts.circle, (cy) => {
        teardownGridScroll(cy);
        cy.nodes().removeClass('hidden centered tile');
        cy.edges().remove();
        cy.add(filteredEdges(cy));
        teardownHover(cy);
      }, 'Circle');

      manager.registerLayout('concentric', layouts.concentric, (cy) => {
        teardownGridScroll(cy);
        cy.nodes().removeClass('hidden centered tile');
        cy.edges().remove();
        cy.add(filteredEdges(cy));
        teardownHover(cy);
      }, 'Concentric');

      // TEAM_THRESHOLD for team layout (joint synergy across all team members)
      const TEAM_THRESHOLD = 0.05;

      manager.registerLayout('team', layouts.grid, (cy) => {
        teardownGridScroll(cy);
        cy.elements().removeClass('hidden centered tile');
        cy.edges().remove();
        teardownHover(cy);

        const tSpecies = manager.teamSpecies;
        if (tSpecies.length === 0) return;

        // Mark team nodes
        const teamNodes = cy.nodes().filter((n: any) => tSpecies.includes(n.data('species')));
        teamNodes.addClass('team');

        // Compute joint synergy for every candidate
        const candidateNodes = cy.nodes().not(teamNodes);
        const visibleMates: any[] = [];

        candidateNodes.forEach((node: any) => {
          const species = node.data('species') as string;
          let total = 0;
          let cnt = 0;
          for (const ts of tSpecies) {
            const mon = team.pokemons.find((p: Pokemon) => p.species === ts);
            if (!mon) continue;
            total += (mon.usage?.teammates?.[species] ?? 0) as number;
            cnt++;
          }
          const jointScore = cnt > 0 ? total / cnt : 0;
          if (jointScore >= TEAM_THRESHOLD) {
            node.data('teamScore', jointScore * 100);
            visibleMates.push(node);
          } else {
            node.addClass('hidden');
          }
        });

        // Add edges from team members to visible mates
        const allEdges: any[] = (cy as any)._regularEdges ?? [];
        const mateIds = new Set(visibleMates.map((n: any) => n.id()));
        const teamIds = new Set<string>();
        teamNodes.forEach((n: any) => { teamIds.add(n.id()); });
        const edgesToAdd = allEdges.filter((e: any) =>
          teamIds.has(e.data.source) && mateIds.has(e.data.target)
        );
        if (edgesToAdd.length) cy.add(edgesToAdd);
      }, 'Team');

      manager.registerLayout('focus', layouts.focus, (cy, selectedNode) => {
        teardownGridScroll(cy);
        cy.elements().removeClass('hidden centered tile');
        cy.edges().remove();
        cy.add((cy as any)._regularEdges ?? []);
        if (!selectedNode) return;

        const focusedId   = selectedNode.id();
        const matesData   = selectedNode.data('teammates') as Record<string, number>;
        const mateNodes   = cy.nodes().filter((n: any) =>
          n.id() !== focusedId && (matesData?.[n.data('species')] ?? 0) >= 0.05
        );

        cy.nodes().not(selectedNode).not(mateNodes).addClass('hidden');
        cy.edges().forEach((edge: any) => {
          const visible = edge.source().id() === focusedId && mateNodes.contains(edge.target());
          edge.toggleClass('hidden', !visible);
        });
        selectedNode.addClass('centered');
        teardownHover(cy);
      }, 'Focus');

      // Sync React state when layout changes
      const unsub = manager.onChange((layoutName, node) => {
        setCurrentLayout(layoutName);
        setSelectedSpecies(node?.data('species') ?? null);
      });

      // Node click → focus; background click → grid
      cyInstance.on('tap', 'node', (e: any) => manager.focusOnNode(e.target));
      cyInstance.on('tap', (e: any) => {
        if (e.target === cyInstance && manager.currentLayout === 'focus') {
          manager.applyLayout('grid');
        }
      });

      manager.applyLayout('grid');
      setLayoutManager(manager);
      setCy(cyInstance);
      setIsLoading(false);

      return () => {
        unsub();
        cyInstance.destroy();
      };
    } catch (err) {
      console.error('Graph init error:', err);
      setErrorMsg(err instanceof Error ? err.message : 'Unknown error');
      setIsLoading(false);
    }
  }, [team]);

  // ── Derived data for the side panel ───────────────────────────────────────
  const selectedPokemon: Pokemon | null = selectedSpecies
    ? team.pokemons.find((p: Pokemon) => p.species === selectedSpecies) ?? null
    : null;

  const usagePct: number = (() => {
    if (!selectedPokemon) return 0;
    return (selectedPokemon.usage?.usage?.real ?? 0) * 100;
  })();

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="relative w-full h-screen overflow-hidden bg-slate-900">

      {/* Cytoscape canvas */}
      <div ref={cyContainerRef} className="absolute inset-0 w-full h-full" />

      {/* ── Side panel (focus mode) ── */}
      <div className={`absolute top-4 right-4 bottom-20 w-72 z-30 transition-transform duration-300 ease-out ${
        currentLayout === 'focus' && selectedPokemon ? 'translate-x-0' : 'translate-x-[calc(100%+2rem)]'
      }`}>
        {selectedPokemon && (
          <div className="h-full rounded-2xl overflow-hidden flex flex-col
              bg-slate-900/80 backdrop-blur-xl border border-white/10 shadow-2xl text-white">

            {/* Close */}
            <button
              onClick={() => layoutManager?.applyLayout('grid')}
              className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              title="Close (Esc)"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Header */}
            <div
              className="flex flex-col items-center pt-8 pb-5 px-4 flex-shrink-0"
              style={{
                background: `linear-gradient(135deg,
                  ${selectedPokemon.displayinfo.type1color}55,
                  ${selectedPokemon.displayinfo.type2color}33)`,
              }}
            >
              <SpriteIcon mon={selectedPokemon} scale={3} />
              <h2 className="text-xl font-bold mt-2 tracking-tight">{selectedPokemon.species}</h2>

              {/* Type badges */}
              <div className="flex gap-2 mt-2">
                {(Array.isArray(selectedPokemon.info.types)
                    ? selectedPokemon.info.types
                    : Object.values(selectedPokemon.info.types)
                  ).filter(Boolean).map((type: string, i: number) => (
                  <span
                    key={type}
                    className="px-3 py-0.5 rounded-full text-xs font-bold text-white uppercase tracking-wide"
                    style={{
                      backgroundColor: i === 0
                        ? selectedPokemon.displayinfo.type1color
                        : selectedPokemon.displayinfo.type2color,
                    }}
                  >
                    {type}
                  </span>
                ))}
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

              {/* Quick stats */}
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="bg-white/5 rounded-xl p-2.5 text-center border border-white/5">
                  <div className="text-white/50 text-xs mb-0.5">Tier</div>
                  <div className="font-semibold">{selectedPokemon.info.tier ?? '—'}</div>
                </div>
                <div className="bg-white/5 rounded-xl p-2.5 text-center border border-white/5">
                  <div className="text-white/50 text-xs mb-0.5">BST</div>
                  <div className="font-semibold">{selectedPokemon.info.bst ?? '—'}</div>
                </div>
                <div className="bg-white/5 rounded-xl p-2.5 border border-white/5 col-span-2">
                  <div className="text-white/50 text-xs mb-2">Abilities</div>
                  {Object.entries(selectedPokemon.usage?.abilities ?? {})
                    .sort(([, a], [, b]) => (b as number) - (a as number))
                    .map(([ability, freq]) => {
                      const pct = (freq as number) * 100;
                      return (
                        <div key={ability} className="mb-1.5 last:mb-0">
                          <div className="flex justify-between text-xs mb-0.5">
                            <span className="font-medium">{ability}</span>
                            <span className="text-white/50">{pct.toFixed(1)}%</span>
                          </div>
                          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${pct}%`,
                                backgroundColor: selectedPokemon.displayinfo.type1color,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Usage bar */}
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-white/50 uppercase tracking-wider">Usage</span>
                  <span className="font-semibold">{usagePct.toFixed(1)}%</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(usagePct * 2, 100)}%`,
                      backgroundColor: selectedPokemon.displayinfo.type1color,
                    }}
                  />
                </div>
              </div>

              {/* Top teammates */}
              <div>
                <h4 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">
                  Top Teammates
                </h4>
                <ul className="space-y-1.5">
                  {Object.entries(selectedPokemon.usage?.teammates ?? {})
                    .sort(([, a], [, b]) => (b as number) - (a as number))
                    .slice(0, 8)
                    .map(([mate, val]) => {
                      const pct = (val as number) * 100;
                      return (
                        <li
                          key={mate}
                          className="rounded-lg p-2 hover:bg-white/10 transition-colors cursor-pointer"
                          onClick={() => {
                            if (!cy || !layoutManager) return;
                            const node = cy.nodes().filter((n: any) => n.data('species') === mate).first();
                            if (node.length) layoutManager.focusOnNode(node as unknown as Cytoscape.NodeSingular);
                          }}
                        >
                          <div className="flex justify-between text-xs mb-1">
                            <span className="font-medium">{mate}</span>
                            <span className="text-white/50">{pct.toFixed(1)}%</span>
                          </div>
                          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full bg-sky-400/70"
                              style={{ width: `${Math.min(pct * 2, 100)}%` }}
                            />
                          </div>
                        </li>
                      );
                    })}
                </ul>
              </div>
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-white/10 flex-shrink-0 space-y-2">
              {/* Add / remove from team */}
              {selectedSpecies && (() => {
                const onTeam = myTeam.includes(selectedSpecies);
                return (
                  <button
                    onClick={() => setMyTeam(prev =>
                      onTeam ? prev.filter(s => s !== selectedSpecies)
                             : prev.length < 6 ? [...prev, selectedSpecies] : prev
                    )}
                    className={`w-full py-2 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                      onTeam
                        ? 'bg-amber-400/20 text-amber-300 hover:bg-amber-400/30 border border-amber-400/30'
                        : 'bg-white/10 hover:bg-white/15 text-white/80'
                    }`}
                  >
                    <Star className={`h-3.5 w-3.5 ${onTeam ? 'fill-amber-300' : ''}`} />
                    {onTeam ? 'On Team — Remove' : myTeam.length >= 6 ? 'Team Full' : 'Add to Team'}
                  </button>
                );
              })()}
              <button
                onClick={() => layoutManager?.applyLayout('grid')}
                className="w-full py-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-sm font-medium"
              >
                ← Back to Grid
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── List view overlay ── */}
      {currentLayout === 'list' && (() => {
        const sorted = [...team.pokemons].sort(
          (a: Pokemon, b: Pokemon) => (b.usage?.usage?.real ?? 0) - (a.usage?.usage?.real ?? 0)
        );
        const maxPct = (sorted[0]?.usage?.usage?.real ?? 1) * 100 || 1;
        return (
          <div className="absolute inset-0 z-20 bg-slate-900 overflow-y-auto">
            <div className="pb-32">
              {sorted.map((mon: Pokemon) => {
                const pct = (mon.usage?.usage?.real ?? 0) * 100;
                const barW = (pct / maxPct) * 100;
                const onTeam = myTeam.includes(mon.species);
                return (
                  <div
                    key={mon.species}
                    className="flex items-center h-12 border-b border-white/5 cursor-pointer hover:bg-white/5 transition-colors"
                    onClick={() => {
                      const node = cy?.nodes().filter((n: any) => n.data('species') === mon.species).first();
                      if (node?.length && layoutManager) layoutManager.focusOnNode(node as unknown as Cytoscape.NodeSingular);
                    }}
                  >
                    {/* Icon */}
                    <div className="flex-shrink-0 w-12 flex items-center justify-center">
                      <SpriteIcon mon={mon} scale={0.9} />
                    </div>
                    {/* Bar + label */}
                    <div className="flex-1 h-full relative">
                      <div
                        className="h-full opacity-70"
                        style={{
                          width: `${barW}%`,
                          background: `linear-gradient(to bottom, ${mon.displayinfo?.type1color ?? '#666'}, ${mon.displayinfo?.type2color ?? mon.displayinfo?.type1color ?? '#666'})`,
                        }}
                      />
                      <span className={`absolute left-2 top-1/2 -translate-y-1/2 text-xs font-bold text-white drop-shadow ${onTeam ? 'text-amber-300' : ''}`}>
                        {mon.species}
                        <span className="font-normal text-white/60 ml-1">{pct.toFixed(1)}%</span>
                      </span>
                      {onTeam && (
                        <Star className="absolute right-3 top-1/2 -translate-y-1/2 h-3 w-3 text-amber-400 fill-amber-400" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* ── Team strip ── */}
      {myTeam.length > 0 && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
          <div className="pointer-events-auto flex items-center gap-1.5
              bg-slate-800/80 backdrop-blur-xl border border-amber-400/20
              rounded-2xl shadow-xl shadow-black/40 px-3 py-2">
            <Star className="h-3 w-3 text-amber-400 fill-amber-400 mr-1 flex-shrink-0" />
            {myTeam.map(species => {
              const mon = team.pokemons.find((p: Pokemon) => p.species === species);
              if (!mon) return null;
              return (
                <div
                  key={species}
                  className="relative group cursor-pointer"
                  title={`${species} — click to remove`}
                  onClick={() => setMyTeam(prev => prev.filter(s => s !== species))}
                >
                  <SpriteIcon mon={mon} scale={0.9} />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100
                      bg-black/60 rounded transition-opacity">
                    <X className="h-3 w-3 text-white" />
                  </div>
                </div>
              );
            })}
            {/* Empty slots */}
            {Array(6 - myTeam.length).fill(null).map((_, i) => (
              <div key={i} className="w-9 h-9 rounded border border-dashed border-white/15" />
            ))}
          </div>
        </div>
      )}

      {/* ── Bottom dock ── */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-1
            bg-slate-800/80 backdrop-blur-xl border border-white/10
            rounded-full shadow-2xl shadow-black/50 px-3 py-2">

          {layoutManager && (
            <LayoutControls layoutManager={layoutManager} currentLayout={currentLayout} />
          )}

          {myTeam.length >= 2 && (
            <>
              <div className="h-5 w-px bg-white/15 mx-1" />
              <button
                onClick={() => layoutManager?.applyLayout('team')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  currentLayout === 'team'
                    ? 'bg-amber-400 text-slate-900 shadow-sm'
                    : 'text-amber-300/80 hover:text-amber-300 hover:bg-amber-400/15'
                }`}
              >
                <Users className="h-3.5 w-3.5" />
                Team
              </button>
            </>
          )}

          <div className="h-5 w-px bg-white/15 mx-1" />

          <span className="text-white/40 text-xs px-2 whitespace-nowrap tabular-nums">
            {graphStats.nodeCount} Pokémon · {graphStats.edgeCount} edges
          </span>

          <div className="h-5 w-px bg-white/15 mx-1" />

          <button
            onClick={() => layoutManager?.reset()}
            className="p-1.5 rounded-full hover:bg-white/10 transition-colors text-white/40 hover:text-white/80"
            title="Reset view"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── Loading overlay ── */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/90 backdrop-blur-sm z-50">
          <div className="text-center text-white space-y-4">
            <div className="w-12 h-12 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto" />
            <p className="text-lg font-medium tracking-tight">Loading Pokémon data…</p>
            <p className="text-sm text-white/40">Fetching usage stats and building graph</p>
          </div>
        </div>
      )}

      {/* ── Error overlay ── */}
      {errorMsg && (
        <div className="absolute inset-0 flex items-center justify-center z-50">
          <div className="bg-slate-800/90 backdrop-blur-xl border border-white/10 rounded-2xl p-8 text-center text-white max-w-sm shadow-2xl">
            <p className="mb-4 text-white/80">{errorMsg}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors text-sm font-medium"
            >
              Reload
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImprovedTestGraph;
