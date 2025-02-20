// Import the required modules
const { Dex } = require('pokemon-showdown');
const fs = require('fs');
const path = require('path');

// Define the format and create the GenDex object
const format = 'gen7';
const GenDex = Dex.mod(format);
const modifiers = {
        
    //SPICY
        //Hardy
        Lonely:     { atk: 1.1, def: 0.9 },
        Brave:      { atk: 1.1, spe: 0.9 },
        Adamant:    { atk: 1.1, spa: 0.9 },
        Naughty:    { atk: 1.1, spd: 0.9 },
    //SOUR
        Bold:       { def: 1.1, atk: 0.9 },
        //Docile
        Relaxed:    { def: 1.1, spe: 0.9 },
        Impish:     { def: 1.1, spa: 0.9 },
        Lax:        { def: 1.1, spd: 0.9 },
    //SWEET
        Timid:      { spe: 1.1, atk: 0.9 },
        Hasty:      { spe: 1.1, def: 0.9 },
        //Serious
        Jolly:      { spe: 1.1, spa: 0.9 },
        Naive:      { spe: 1.1, spd: 0.9 },
    //BITTER
        Modest:     { spa: 1.1, atk: 0.9 },
        Mild:       { spa: 1.1, def: 0.9 },
        Quiet:      { spa: 1.1, spe: 0.9 },
        //Bashful
        Rash:       { spa: 1.1, spd: 0.9 },
    //DRY
        Calm:       { spd: 1.1, atk: 0.9 },
        Gentle:     { spd: 1.1, def: 0.9 },
        Sassy:      { spd: 1.1, spe: 0.9 },
        Careful:    { spd: 1.1, spa: 0.9 },
        //Quirky
    };

// Define the file path for the JSON team
const jsonFilePath = path.join(__dirname, 'data/team.json');

function calculateStat(base, iv, ev, level, natureModifier) {
    return Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level / 100 + 5) * natureModifier);
}
  
function calculateHP(base, iv, ev, level) {
    return Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level / 100) + level + 10);
}  
// outputs array like this { hp: 1, atk: 1, def: 1, spa: 1, spd: 1, spe: 1 }
function getNatureModifier(nature) {
    return { // Changed colon to equal sign
        atk: modifiers[nature]?.atk || 1,
        def: modifiers[nature]?.def || 1,
        spa: modifiers[nature]?.spa || 1,
        spd: modifiers[nature]?.spd || 1,
        spe: modifiers[nature]?.spe || 1
    };
}
function getNatureDescription(nature, modifiers) {
    const descriptions = {
        atk: "Atk",
        def: "Def",
        spa: "SpA",
        spd: "SpD",
        spe: "Spe"
    };

    const modifier = modifiers[nature];
    const positive = Object.keys(modifier).find(key => modifier[key] > 1);
    const negative = Object.keys(modifier).find(key => modifier[key] < 1);

    return `${nature} (+${descriptions[positive]}, -${descriptions[negative]})`;
}


// Read the JSON team from team.jsons
fs.readFile(jsonFilePath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading JSON file:', err);
      return;
    }
  
    // Parse the JSON data
    const team = JSON.parse(data);
  
    // Create an array to store base stats
    const baseStatsArray = [];
  
    // Iterate over each Pokémon in the team
    team.forEach(pokemon => {
      const species = GenDex.species.get(pokemon.species);
      const baseStats = {
        hp: species.baseStats.hp,
        attack: species.baseStats.atk,
        defense: species.baseStats.def,
        specialAttack: species.baseStats.spa,
        specialDefense: species.baseStats.spd,
        speed: species.baseStats.spe,
      };
      const info = {
        name: species.name,
        tier: species.tier,
        bst: species.baseStats.hp + species.baseStats.atk + species.baseStats.def + species.baseStats.spa + species.baseStats.spd + species.baseStats.spe,
        level: pokemon.level || 100,
        nature: pokemon.nature || 'Serious'
      };
    const natureModifier = getNatureModifier(pokemon.nature) || { hp: 1, atk: 1, def: 1, spa: 1, spd: 1, spe: 1 };
    //TODO: nature modifiers 
    const ivs = pokemon.ivs || { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 };
    const evs = pokemon.evs || { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };

    const effectiveStats = {
        hp: calculateHP(baseStats.hp, ivs.hp, evs.hp, pokemon.level),
        attack: calculateStat(baseStats.attack, ivs.atk, evs.atk, pokemon.level, natureModifier.atk),
        defense: calculateStat(baseStats.defense, ivs.def, evs.def, pokemon.level, natureModifier.def),
        specialAttack: calculateStat(baseStats.specialAttack, ivs.spa, evs.spa, pokemon.level, natureModifier.spa),
        specialDefense: calculateStat(baseStats.specialDefense, ivs.spd, evs.spd, pokemon.level, natureModifier.spd),
        speed: calculateStat(baseStats.speed, ivs.spe, evs.spe, pokemon.level, natureModifier.spe),
    };

    // Print the base stats for each Pokémon
    console.log(`Name: ${info.name}`);
    console.log(`Tier: ${info.tier}`);
    console.log(`Nature: ${getNatureDescription(info.nature, modifiers)}`);
    console.log('----------------------------------------');
    /* for (const [stat, value] of Object.entries(baseStats)) {
        console.log(stat+": "+value)
    } */
    console.log('----------------------------------------');
    for (const [stat, value] of Object.entries(effectiveStats)) {
        console.log(stat+": "+value)
    }
    console.log('----------------------------------------');
    console.log(`BST: ${info.bst}`);
    console.log('========================================');
});

// Print the baseStatsArray to verify the data
//console.log('Base Stats Array:', baseStatsArray);
});