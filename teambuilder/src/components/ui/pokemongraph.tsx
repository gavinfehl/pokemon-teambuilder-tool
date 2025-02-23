"use client";

import React from "react";
import CytoscapeComponent from "react-cytoscapejs";
import pokemonDataRaw from "@/data/parsedmovesetusagedata.json";
import cytoscape from "cytoscape";


// Define types
interface Teammate {
  item: string;
  value: string;
}

interface PokemonData {
  Pokemon: string;
  Raw_Count: string;
  Teammates: Teammate[];
}

interface PokemonData {
  Pokemon: string;
  Raw_Count: string; // Ensure this matches your JSON structure
  Teammates: Teammate[];
}

// Ensure pokemonDataRaw is treated as an array
const pokemonData: PokemonData[] = pokemonDataRaw as PokemonData[];

// Pick a specific Pokémon (change "Landorus-Therian" as needed)
const selectedPokemon = pokemonData.find(p => p.Pokemon === "Landorus-Therian");

if (!selectedPokemon) {
  console.error("Pokemon not found!");
}

// Safely extract values
const rawCount = selectedPokemon ? parseFloat(selectedPokemon.Raw_Count) : 10;
const baseSize = 30; // Minimum node size
const scaledSize = baseSize + Math.log1p(rawCount) * 5; // Log scaling for balance

const elements: cytoscape.ElementDefinition[] = [];

if (selectedPokemon) {
  elements.push({
    data: { id: selectedPokemon.Pokemon, label: selectedPokemon.Pokemon, size: scaledSize },
    classes: "main"
  });

  selectedPokemon.Teammates.forEach(teammate => {
    const percentage = parseFloat(teammate.value);
    elements.push({
      data: { id: teammate.item, label: teammate.item, size: baseSize }
    });
    elements.push({
      data: {
        id: `${selectedPokemon.Pokemon}-${teammate.item}`,
        source: selectedPokemon.Pokemon,
        target: teammate.item,
        label: teammate.value,
        width: percentage / 5
      }
    });
  });
}



const layout = {
  name: 'circle',
  fit: true, // whether to fit the viewport to the graph
  padding: 30, // the padding on fit
  boundingBox: undefined, // constrain layout bounds; { x1, y1, x2, y2 } or { x1, y1, w, h }
  avoidOverlap: true, // prevents node overlap, may overflow boundingBox and radius if not enough space
  nodeDimensionsIncludeLabels: false, // Excludes the label when calculating node bounding boxes for the layout algorithm
  spacingFactor: undefined, // Applies a multiplicative factor (>0) to expand or compress the overall area that the nodes take up
  radius: undefined, // the radius of the circle
  startAngle: 3 / 2 * Math.PI, // where nodes start in radians
  sweep: undefined, // how many radians should be between the first and last node (defaults to full circle)
  clockwise: true, // whether the layout should go clockwise (true) or counterclockwise/anticlockwise (false)
  sort: undefined, // a sorting function to order the nodes; e.g. function(a, b){ return a.data('weight') - b.data('weight') }
  animate: false, // whether to transition the node positions
  animationDuration: 500, // duration of animation in ms if enabled
  animationEasing: undefined, // easing of animation if enabled
  ready: undefined, // callback on layoutready
  stop: undefined, // callback on layoutstop
};

const styleSheet: cytoscape.Stylesheet[] = [
  {
    selector: "node",
    style: {
      "background-color": "#FFA500",
      label: "data(label)",
      "text-valign": "center",
      "text-halign": "center" as "center",
      "font-size": "12px",
      color: "#fff"
    }
  },
  {
    selector: ".main",
    style: {
      "background-color": "#FF4500",
      "font-size": "14px",
      "border-width": "2px",
      "border-color": "#fff"
    }
  },
  {
    selector: "edge",
    style: {
      width: "data(width)",
      "line-color": "#4682B4",
      "target-arrow-color": "#4682B4",
      "target-arrow-shape": "triangle",
      "font-size": "10px",
      "text-background-opacity": 1,
      "text-background-color": "#fff",
      "text-background-shape": "roundrectangle",
      "text-background-padding": "2px"
    }
  }
];

const PokemonGraph = () => {
  return (
    <CytoscapeComponent
      elements={elements}
      style={{ width: "100vw", height: "100vh" }}
      layout={layout}
      stylesheet={styleSheet}
    />
  );
};

export default PokemonGraph;
