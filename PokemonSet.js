const {Teams, TeamValidator} = require('pokemon-showdown');
const Pokemon = require('./Pokemon');
const fs = require('fs');
const path = require('path');

class PokemonSet {
    constructor(name) {
        this.name = name;
        this.pokemons = [];1
        this.format = 'gen7ou';
        this.teamExportTXT = path.join(__dirname, 'data/team.txt');
        this.teamJSON = path.join(__dirname, 'data/team.json');
        this.teamPacked = path.join(__dirname, 'data/packedteam.txt');
        
    }
    // Add a Pokémon to the set
    addPokemonFromSpecies(species) {
        let pokemon = new Pokemon(species);
        pokemon.dex.exists ? this.pokemons.push(pokemon) : console.log("Invalid Pokémon species.");
    }
    addPokemonObject(pokemon) {
        this.pokemons.push(pokemon);
    }
    // Set the export data file paths
    setExportData(txt, json, packed) {
        this.teamExportTXT = path.join(__dirname, txt);
        this.teamJSON = path.join(__dirname, json);
        this.teamPacked = path.join(__dirname, packed);
    }
  
    removePokemon(species) {
        this.pokemons = this.pokemons.filter(pokemon => pokemon.species !== species);
    }

    toString(){
        let result = '';
        this.pokemons.forEach(pokemon => {
            result += pokemon.toString() + '\n';
        });
        return result.trim();
    }
  }
  
class Team extends PokemonSet {
    constructor() {
        super('Team');
    }
  
    addPokemonFromSpecies(species) {
        if (this.pokemons.length < 6) {
            super.addPokemonFromSpecies(species);
        } else {
            console.log("A team can only have up to 6 Pokémon.");
        }
    }
    addPokemonObject(pokemon) {
        if (this.pokemons.length < 6) {
            super.addPokemonObject(pokemon);
        } else {
            console.log("A team can only have up to 6 Pokémon.");
        }
    }
}

module.exports = {
    PokemonSet,
    Team
};