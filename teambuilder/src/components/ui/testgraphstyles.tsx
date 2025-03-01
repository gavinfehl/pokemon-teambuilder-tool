import Cytoscape, { ElementsDefinition, ElementDefinition, LayoutOptions } from 'cytoscape';
const styleOptions: cytoscape.Stylesheet[] = [
    {
        selector: 'node',
        css: {
            'color': 'data(colors[0])',
            'background-fill': 'radial-gradient',
            'background-gradient-stop-colors': 'data(colors)',
            //'label': 'data(label)',
            'font-size': '20',
            'width': 'data(size)',
            'height': 'data(size)',
            'background-width': 'data(spriteWidth)',
            'background-opacity': '0.35',
            'background-height': 'data(spriteHeight)',
            'background-image': 'data(sprite)',
            'background-position-x': 'data(spritePositionX)',
            'background-position-y': 'data(spritePositionY)',
            'background-fit': 'none',
            'background-image-smoothing': 'no'
        }
    },
    {
        selector: 'node.centered',
        css: {
            'color': 'data(colors[0])',
            'background-fill': 'radial-gradient',
            'background-gradient-stop-colors': 'data(colors)',
            'shape': 'star',
            'label': 'data(label)',
            'font-size': '50',
            'width': '350',
            'height': '350',
            'background-width': '4200',
            'background-height': '46550',
            'background-image': 'data(sprite)',
            'background-position-x': 'data(gridSpritePositionX)',
            'background-position-y': 'data(gridSpritePositionY)',
            'background-fit': 'none',
            'background-image-smoothing': 'no'
        }
    },
    {
        selector: 'node.tile',
        css: {
            'color': 'black',
            'background-fill': 'linear-gradient',
            'background-gradient-stop-colors': 'data(colors)',
            'shape': 'rectangle',
            'label': '',
            'font-size': '20',
            'width': '350',
            'height': '350',
            'background-width': '4200',
            'background-height': '46550',
            'background-image': 'data(sprite)',
            'background-position-x': 'data(gridSpritePositionX)',
            'background-position-y': 'data(gridSpritePositionY)',
            'background-fit': 'none',
            'background-image-smoothing': 'no'
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
            'width': 'mapData(weight, 0, 100, 0, 20)',
            'label': 'data(label)',
            'color': 'white',
            'font-size': '20',
            'line-color': 'black',
            'target-arrow-color': '#ccc',
            'target-arrow-shape': 'triangle',
            'target-arrow-scale': '5'
        }
    },
    {
        selector: 'edge.hidden',
        css: {
            'width': 0
        }
    },
    {
        selector: 'core',
        css: {
            'active-bg-color': 'red',
        }
    },
];
export default styleOptions;
