// Import the required modules
const {Teams, TeamValidator} = require('pokemon-showdown');
const Pokemon = require('./Pokemon');
const fs = require('fs');
const path = require('path');

// DEFINITIONS

// Define the format and create the GenDex object
const format = 'gen7ou';

// Define the file path for the input JSON team
const inputJsonFilePath = path.join(__dirname, 'data/team.json');
// Define the file path for the input packed team
const inputPackedFilePath = path.join(__dirname, 'data/packedteam.txt');
// Define the file path for the output JSON team
const outputJsonFilePath = path.join(__dirname, 'data/advancedteam.json');
const validator = new TeamValidator(format);

const isValidTeam = validator.validateTeam(
  Teams.unpack(inputPackedFilePath)
);

function initializeTeam() {
    try {
        const data = fs.readFileSync(inputJsonFilePath, 'utf8');
        const importedTeam = JSON.parse(data);
        const team = [];
        
        importedTeam.forEach(teamMember => {
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
            team.push(pokemon);
        });

        team.forEach(pokemon => console.log(pokemon.toString()));
        console.log("Team initialized successfully:");
        return team;
    } catch (err) {
        console.error('Error initializing team:', err);
        return [];
    }
}

if (isValidTeam){
    initializeTeam();
}else{
    console.log("This team is invalid\nReason:"+console.log(stderr))
}