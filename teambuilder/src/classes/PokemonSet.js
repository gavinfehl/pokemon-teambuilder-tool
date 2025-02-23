const {Teams, TeamValidator} = require('pokemon-showdown');
const Pokemon = require('./Pokemon');
const fs = require('fs');
const path = require('path');

// Contains a set of Pokémon as well as the format and export data file paths.
class PokemonSet {
    constructor(name) {
        this.name = name;
        this.pokemons = [];
        this.format = 'gen7ou';
        this.teamExportFile = path.join(__dirname, '../data/team.txt');
        this.teamJSONFile = path.join(__dirname, '../data/team.json');
        this.teamPackedFile = path.join(__dirname, '../data/packedteam.txt');
        this.teamAdvancedJSONFile = path.join(__dirname, '../data/advancedteam.json');
        
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
    addPokemonFromSpecies(species) {
        let pokemon = new Pokemon(species);
        pokemon.dex.exists ? this.pokemons.push(pokemon) : console.log("Invalid Pokémon species.");
    }
    // Add a Pokémon object to the set
    addPokemonObject(pokemon) {
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
    importTeam(file = this.teamExportFile) {
        this.removeAllPokemon();
        // Read the exported team string from team.txt
        fs.readFile(file, 'utf8', (err, data) => {
          if (err) {
            console.error('Error reading file:', err);
            return;
          }
        
          // Convert the exported team string to a JSON team
          const jsonTeam = Teams.import(data);
          
          // Add pokemon to this team object
          this.initializeTeam(jsonTeam);

          // Convert the JSON team to a string format
          const jsonString = JSON.stringify(jsonTeam, null, 2);
        
          // Save the JSON team to a file
          
          fs.writeFile(this.teamJSONFile, jsonString, { flag: 'w' }, (err) => {
            if (err) {
              console.error('Error writing JSON team file:', err);
            } else {
              console.log('Team saved to', this.teamJSONFile);
            }
          });
          
        
          // Convert the exported team string to a JSON team
          const packedTeam = Teams.pack(jsonTeam);
          // Save the packed team to a file
          fs.writeFile(this.teamPackedFile, packedTeam, { flag: 'w' }, (err) => {
            if (err) {
              console.error('Error writing packed team file:', err);
            } else {
              console.log('Team saved to', this.teamPackedFile);
            }
          });
        });
    }

    // Export the team to all three file types
    exportTeam(){
        const teamJSON = this.pokemons.map(pokemon => pokemon.toJSON());
        const teamString = Teams.export(teamJSON);
        const packedTeam = Teams.pack(teamJSON);

        fs.writeFile(this.teamExportFile, teamString, { flag: 'w' }, (err) => {
            if (err) {
                console.error('Error writing team export file:', err);
            } else {
                console.log('Team exported to', this.teamExportFile);
            }
        });

        fs.writeFile(this.teamJSONFile, JSON.stringify(teamJSON, null, 2), { flag: 'w' }, (err) => {
            if (err) {
                console.error('Error writing JSON team file:', err);
            } else {
                console.log('Team saved to', this.teamJSONFile);
            }
        });

        fs.writeFile(this.teamPackedFile, packedTeam, { flag: 'w' }, (err) => {
            if (err) {
                console.error('Error writing packed team file:', err);
            } else {
                console.log('Team saved to', this.teamPackedFile);
            }
        });
    }
    // Uses toFullJSON to export the team instead of toJSON
    advancedExportTeam(){
        const teamJSON = this.pokemons.map(pokemon => pokemon.toFullJSON());
        fs.writeFile(this.teamAdvancedJSONFile, JSON.stringify(teamJSON, null, 2), { flag: 'w' }, (err) => {
            if (err) {
                console.error('Error writing JSON team file:', err);
            } else {
                console.log('Team saved to', this.teamAdvancedJSONFile);
            }
        });
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
    PokemonTeam
};
