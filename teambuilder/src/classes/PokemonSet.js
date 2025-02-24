const Pokemon = require('./Pokemon');

// Contains a set of Pokémon as well as the format and export data file paths.
class PokemonSet {
    constructor(name) {
        this.name = name;
        this.pokemons = [];
        this.format = 'gen7';
        this.teamExportString = '';
        this.teamJSON = {};
        this.teamPackedString = '';
        this.teamAdvancedJSON = {};
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
            console.log("pokemon added:\n"+pokemon.toString());
            return pokemon;
        } else {
            console.error("Invalid Pokémon species.");
            return null;
        }
    }
    // Add a Pokémon object to the set
    async addPokemonObject(pokemon) {
        await pokemon.init(this.format, pokemon.species);
        this.pokemons.push(pokemon);
    }
    // Remove a Pokémon from the set with the given species name.
    removePokemonBySpecies(species) {
        const index = this.pokemons.findIndex(pokemon => pokemon.species === species);
        if (index !== -1) {
            return this.pokemons.splice(index, 1)[0]; // Remove and return the first matching Pokémon
        }
        return null; // Return null if no Pokémon of the species is found
    }
    // Remove a Pokémon from the set by index    
    removePokemonByIndex(index) {
        if (index >= 0 && index < this.pokemons.length) {
            const removedPokemon = this.pokemons.splice(index, 1);
            return removedPokemon[0];
        } else {
            console.log("Invalid index.");
            return null;
        }
    }
    removeAllPokemon() {
        this.pokemons = [];
    }
    // Initialize the team with the given JSON team data
    async initializeTeam(json) {
        try {
            for (const teamMember of json) { 
                console.log("JSON PRINT", json);
                console.log("In INIT team - species of teamMember: ", teamMember.species);
    
                const pokemon = new Pokemon(
                    teamMember.species ?? undefined,
                    teamMember.name ?? undefined,
                    teamMember.gender ?? undefined,
                    teamMember.ability ?? undefined,
                    teamMember.level ?? undefined,
                    teamMember.nature ?? undefined,
                    teamMember.happiness ?? undefined,
                    teamMember.shiny ?? undefined,
                    teamMember.hiddenpowertype ?? undefined,
                    teamMember.teratype ?? undefined,
                    teamMember.item ?? undefined,
                    teamMember.ivs ?? undefined,
                    teamMember.evs ?? undefined,
                    {
                        move1: teamMember.moves?.[0] ?? null,
                        move2: teamMember.moves?.[1] ?? null,
                        move3: teamMember.moves?.[2] ?? null,
                        move4: teamMember.moves?.[3] ?? null
                    }
                );
    
                console.log("In INIT team - species of pokemon: ", pokemon.species);
                await this.addPokemonObject(pokemon);
            }
            return;
        } catch (err) {
            console.error('Error initializing team:', err);
            return;
        }
    }

    // Import the team from the team.txt file
    async importTeam(importString) {
        console.log("Sending teamString:", importString);
        const response = await fetch(`http://localhost:3000/importteam`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                json: importString
            })
        });
        if (response.ok) {
            const importResponse = await response.json();
            console.log("TEAMS IMPORT OUTPUT: ", importResponse);  // Should log the correct data
            this.removeAllPokemon();

            this.teamExportString = importString;
            this.teamJSON = importResponse.teamJSON;
            this.teamPackedString = importResponse.teamPackedString;
            console.log("Team JSON from pokemonSet: ", this.teamJSON);
            await this.initializeTeam(this.teamJSON);
            return importResponse;
        } else {
            console.error('Failed to fetch Teams import data:', response.status);
            return null;
        }
    }

    // Export the team to all three file types
    async exportTeam(){
        const response = await fetch(`http://localhost:3000/exportteam`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                adv: this.pokemons.map(pokemon => pokemon.toFullJSON()),
                normal: this.pokemons.map(pokemon => pokemon.toJSON())
            })
        });
    
        if (response.ok) {
            const exportResponse = await response.json();
            console.log("TEAMS EXPORT OUTPUT: ", exportResponse);
            this.teamJSON = exportResponse.teamJSON;
            this.teamExportString = exportResponse.teamExportString;
            this.teamPackedString = exportResponse.teamPackedString;
            this.teamAdvancedJSON = exportResponse.teamAdvancedJSON;
            return exportResponse;
        } else {
            console.error('Failed to fetch Teams export data:', response.status);
            return null;
        }
    }
    

    // Print the team
    toString(){
        let result = '';
        this.pokemons.forEach(pokemon => {
            result += pokemon.toString() + '\n';
        });
        return result.trim();
    }

    toImages(){
        return this.pokemons.map(pokemon => pokemon.displayinfo.spriteRelativePath);
    }
}

// Team class is a more specific version of PokemonSet that can only have up to 6 Pokémon.
class PokemonTeam extends PokemonSet {
    constructor(name) {
        super(name);
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
            await super.addPokemonObject(pokemon);
        } else {
            console.log("A team can only have up to 6 Pokémon.");
        }
    }
}

module.exports = {
    PokemonSet,
    PokemonTeam
};
