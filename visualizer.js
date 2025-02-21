const fs = require('fs');
const D3Node = require('d3-node').D3Node;
const d3 = require('d3');

// Function to parse the Pokemon data format
function parsePokemonData(rawData) {
    const sections = rawData.split('+----------------------------------------+');
    const pokemonData = {};
    
    sections.forEach(section => {
        // Extract Pokemon name
        const nameMatch = section.match(/\|\s+([^|\n]+?)\s+\|/);
        if (!nameMatch) return;
        
        const name = nameMatch[1].trim();
        if (!name || name === '') return;
        
        // Extract usage count
        const usageMatch = section.match(/Raw count:\s+(\d+)/);
        const usage = usageMatch ? parseInt(usageMatch[1]) : 0;
        
        // Extract teammates
        const teammatesSection = section.match(/\| Teammates([\s\S]*?)\+---/);
        const teammates = {};
        
        if (teammatesSection) {
            const teammateLines = teammatesSection[1].match(/\|\s+([^|]+?)\s+(\d+\.\d+)%/g) || [];
            teammateLines.forEach(line => {
                const [_, teammate, percentage] = line.match(/\|\s+([^|]+?)\s+(\d+\.\d+)%/) || [];
                if (teammate && percentage) {
                    teammates[teammate.trim()] = parseFloat(percentage);
                }
            });
        }
        
        pokemonData[name] = {
            usage,
            teammates
        };
    });
    
    return pokemonData;
}

// Create the visualization
function createVisualization(data) {
    const d3n = new D3Node();
    const svg = d3n.createSVG(1000, 800);
    
    // Create nodes and links arrays
    const nodes = Object.entries(data).map(([name, info]) => ({
        id: name,
        usage: info.usage
    }));
    
    const links = [];
    Object.entries(data).forEach(([source, info]) => {
        Object.entries(info.teammates).forEach(([target, strength]) => {
            links.push({
                source,
                target,
                strength
            });
        });
    });
    
    // Create force simulation
    const simulation = d3.forceSimulation(nodes)
        .force("link", d3.forceLink(links).id(d => d.id))
        .force("charge", d3.forceManyBody().strength(-200))
        .force("center", d3.forceCenter(500, 400));
    
    // Add links
    const link = svg.selectAll(".link")
        .data(links)
        .enter()
        .append("line")
        .attr("stroke", "#999")
        .attr("stroke-opacity", 0.6)
        .attr("stroke-width", d => Math.sqrt(d.strength));
    
    // Add nodes
    const node = svg.selectAll(".node")
        .data(nodes)
        .enter()
        .append("g");
    
    node.append("circle")
        .attr("r", d => Math.sqrt(d.usage) / 20)
        .attr("fill", "#69b3a2");
    
    node.append("text")
        .text(d => d.id)
        .attr("font-size", "10px")
        .attr("dx", 12)
        .attr("dy", 4);
    
    // Update positions
    simulation.on("tick", () => {
        link
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);
        
        node
            .attr("transform", d => `translate(${d.x},${d.y})`);
    });
    
    // Export to SVG file
    fs.writeFileSync('pokemon-network.svg', d3n.svgString());
}

// Main execution
function main() {
    // Read input file
    const rawData = fs.readFileSync('paste.txt', 'utf8');
    const pokemonData = parsePokemonData(rawData);
    createVisualization(pokemonData);
    console.log('Visualization has been saved as pokemon-network.svg');
}

main();