// improvedStyles.ts - Fixed gradient text strokes with proper colors
import Cytoscape from 'cytoscape';

const Styles: any[] = [
    {
        selector: 'node',
        css: {
            // Background and sprite
            'background-fill': 'radial-gradient',
            'background-gradient-stop-colors': 'data(colors)',
            'background-opacity': '0.35',
            'width': 'data(size)',
            'height': 'data(size)',
            'background-width': 'data(spriteWidth)',
            'background-height': 'data(spriteHeight)',
            'background-image': 'data(sprite)',
            'background-position-x': 'data(spritePositionX)',
            'background-position-y': 'data(spritePositionY)',
            'background-fit': 'none',
            'background-image-smoothing': 'no',
            
            // Text styling - WHITE text with type1 color stroke
            'label': 'data(label)',
            'text-valign': 'top',
            'text-halign': 'center',
            'text-margin-y': '-15px',
            'color': '#ffffff',  // WHITE text
            'text-outline-width': '4px',
            'text-outline-color': 'data(colors[0])',  // Type 1 color stroke ONLY
            'text-outline-opacity': '1',
            'font-size': '16px',
            'font-weight': 'bold',
            'z-index': '100',
        }
    },
    {
        selector: 'node.centered',
        css: {
            'background-fill': 'radial-gradient',
            'background-gradient-stop-colors': 'data(colors)',
            'shape': 'star',
            'width': '350',
            'height': '350',
            'background-width': '4200',
            'background-height': '46550',
            'background-image': 'data(sprite)',
            'background-position-x': 'data(gridSpritePositionX)',
            'background-position-y': 'data(gridSpritePositionY)',
            'background-fit': 'none',
            'background-image-smoothing': 'no',
            
            // Text styling - WHITE text with type1 color stroke
            'label': 'data(label)',
            'text-valign': 'top',
            'text-halign': 'center',
            'text-margin-y': '-25px',
            'color': '#ffffff',  // WHITE text
            'text-outline-width': '5px',
            'text-outline-color': 'data(colors[0])',  // Type 1 color stroke ONLY
            'text-outline-opacity': '1',
            'font-size': '28px',
            'font-weight': 'bold',
            'z-index': '100',
        }
    },
    {
        selector: 'node.tile',
        css: {
            'background-fill': 'linear-gradient',
            'background-gradient-stop-colors': 'data(colors)',
            'shape': 'rectangle',
            'width': '350',
            'height': '350',
            'background-width': '4200',
            'background-height': '46550',
            'background-image': 'data(sprite)',
            'background-position-x': 'data(gridSpritePositionX)',
            'background-position-y': 'data(gridSpritePositionY)',
            'background-fit': 'none',
            'background-image-smoothing': 'no',
            
            // NO LABEL in grid/tile view
            'label': '',
            'text-opacity': '0',
        }
    },
    {
        selector: 'node.hidden',
        css: {
            'display': 'none',
        }
    },
    {
        selector: 'edge',
        css: {
            // Cleaner edge styling
            'width': 'mapData(weight, 0, 100, 2, 12)',
            'label': 'data(label)',
            'font-size': '14px',
            'font-weight': 'bold',
            
            // Edge colors using a single color scheme
            'line-color': '#333333',
            'target-arrow-color': '#333333',
            'target-arrow-shape': 'triangle',
            'target-arrow-scale': '2',
            
            // Edge label styling - simple and readable
            'color': '#000000',
            'text-outline-width': '2px',
            'text-outline-color': '#ffffff',
            'text-outline-opacity': '0.8',
            
            // Smooth curves
            'curve-style': 'bezier',
            'control-point-step-size': '40px',
            
            'z-index': '50',
        }
    },
    {
        selector: 'edge[type = "synergy"]',
        css: {
            // Synergy edges (for fcose physics) - subtle
            'width': 'mapData(weight, 0, 100, 1, 6)',
            'line-color': '#cccccc',
            'line-style': 'dotted',
            'target-arrow-shape': 'none',
            'label': '',
            'opacity': '0.0',
            'z-index': '10',
        }
    },
    {
        selector: 'edge.hidden',
        css: {
            'width': 0,
            'opacity': 0,
        }
    },
    {
        selector: 'core',
        css: {
            'active-bg-color': 'red',
        }
    },
];

export default Styles;