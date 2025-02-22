const {Teams, TeamValidator} = require('pokemon-showdown');
class PokemonSet {
    constructor(name) {
        this.name = name;
        this.pokemons = [];
        this.format = 'gen7ou';
        this.teamExportTXT = path.join(__dirname, 'data/team.txt');
        this.teamJSON = path.join(__dirname, 'data/team.json');
        this.teamPacked = path.join(__dirname, 'data/packedteam.txt');
        
    }
    
    addPokemon(pokemon) {
        this.pokemons.push(pokemon);
    }
    setExportData(pokemon) {
        this.pokemons.push(pokemon);
    }
  
    removePokemon(name) {
        this.pokemons = this.pokemons.filter(pokemon => pokemon.name !== name);
    }
  
    getSet() {
        return this.pokemons.map(pokemon => pokemon.getInfo());
    }

    toString(){
        return this.pokemons.map(pokemon => pokemon.toString());
    }
  }
  
class Team extends PokemonSet {
    constructor() {
        super('Team');
    }
  
    addPokemon(pokemon) {
        if (this.pokemons.length < 6) {
            super.addPokemon(pokemon);
        } else {
            console.log("A team can only have up to 6 Pokémon.");
        }
    }
}

module.exports = {
    PokemonSet,
    Team
};