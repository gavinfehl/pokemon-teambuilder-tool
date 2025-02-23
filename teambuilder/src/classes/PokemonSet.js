const Pokemon = require('./Pokemon');

// Contains a set of Pokémon as well as the format and export data file paths.
class PokemonSet {
    constructor(name) {
        this.name = name;
        this.pokemons = [];
        this.format = 'gen7';
/*      this.teamExportFile = path.join(__dirname, '../data/team.txt');
        this.teamJSONFile = path.join(__dirname, '../data/team.json');
        this.teamPackedFile = path.join(__dirname, '../data/packedteam.txt');
        this.teamAdvancedJSONFile = path.join(__dirname, '../data/advancedteam.json'); */
        this.teamExportString = 'NEEDTOMAKETHISSOMETHINGSINCENOTUSINGTXTFILES';
        this.teamJSON = '';
        this.teamPackedString = '';
        this.teamAdvancedJSON = '';
    }
    // Get a Pokémon from the set by species name or index
    getMember(identifier) {
        if (typeof identifier === 'number') {
            return this.pokemons[identifier] || null;
        } else if (typeof identifier === 'string') {
            return this.pokemons.find(pokemon => pokemon.species === identifier) || null;
        } else {
            return null;
        }
    }
    // Get usage data for each Pokémon in the set
    printUsageData() {
        this.pokemons.forEach(pokemon => {
            console.log(pokemon.getUsageData());
            console.log(pokemon.getMovesetUsageData());
        });
        return;
    }
    // Add a Pokémon to the set with the given species name with no extra information.
    async addPokemonFromSpecies(species) {
        const pokemon = new Pokemon(species);
        await pokemon.init(this.format, species);
        if (pokemon) {
            this.pokemons.push(pokemon);
            return pokemon;
        } else {
            console.log("Invalid Pokémon species.");
            return null;
        }
    }

    // Add a Pokémon object to the set
    async addPokemonObject(pokemon) {
        await pokemon.init();
        this.pokemons.push(pokemon);
    }
    // Remove a Pokémon from the set with the given species name.
    removePokemon(species) {
            this.pokemons = this.pokemons.filter(pokemon => pokemon.species !== species);
    }
    removeAllPokemon() {
        this.pokemons = [];
    }
    // Initialize the team with the given JSON team data
    initializeTeam(json){
        try {
            json.forEach(teamMember => {
                const pokemon = new Pokemon(
                    teamMember.species,
                    teamMember.name,
                    teamMember.gender,
                    teamMember.ability,
                    teamMember.level,
                    teamMember.nature,
                    teamMember.happiness,
                    teamMember.shiny,
                    teamMember.hiddenpowertype,
                    teamMember.teratype,
                    teamMember.item,
                    teamMember.ivs,
                    teamMember.evs,
                    {
                        move1: teamMember.moves[0] || null,
                        move2: teamMember.moves[1] || null,
                        move3: teamMember.moves[2] || null,
                        move4: teamMember.moves[3] || null
                    }
                )
                this.addPokemonObject(pokemon);
            });
            //console.log("Team initialized successfully:");
            return;
        } catch (err) {
            console.error('Error initializing team:', err);
            return;
        }
    }

    // Import the team from the team.txt file
    importTeam(teamString) {
        this.removeAllPokemon();
        this.teamJSON = Teams.import(teamString);
        this.teamPackedString = Teams.pack(teamJSON);
        
        // Add pokemon to this team object
        this.initializeTeam(jsonTeam);
    }

    // Export the team to all three file types
    exportTeam(){
        this.teamJSON = this.pokemons.map(pokemon => pokemon.toJSON());
        this.teamExportString = Teams.export(teamJSON);
        this.teamPackedString = Teams.pack(teamJSON);
    }
    // Uses toFullJSON to export the team instead of toJSON
    advancedExportTeam(){
        this.teamAdvancedJSON = JSON.stringify(this.pokemons.map(pokemon => pokemon.toFullJSON()));
    } 

    // Print the team
    toString(){
        let result = '';
        this.pokemons.forEach(pokemon => {
            result += pokemon.toString() + '\n';
        });
        return result.trim();
    }
}


// Team class is a more specific version of PokemonSet that can only have up to 6 Pokémon.
class PokemonTeam extends PokemonSet {
    constructor() {
        super('Team');
    }
  
    async addPokemonFromSpecies(species) {
        if (this.pokemons.length < 6) {
            await super.addPokemonFromSpecies(species);
        } else {
            console.log("A team can only have up to 6 Pokémon.");
        }
    }
    async addPokemonObject(pokemon) {
        if (this.pokemons.length < 6) {
            await super.addPokemonObject(species);
        } else {
            console.log("A team can only have up to 6 Pokémon.");
        }
    }
}

module.exports = {
    PokemonSet,
    PokemonTeam
};
