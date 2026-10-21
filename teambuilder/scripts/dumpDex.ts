// DEFUNCT: pokemon-showdown was removed in favour of @pkmn/dex + @pkmn/data + @pkmn/sets.
// This script no longer runs. Update to use @pkmn/dex if you need to regenerate dex data.
const { Dex } = require('pokemon-showdown');
const fs = require('fs');

const dexData = {
    species: Dex.species.all(),
    moves: Dex.moves.all(),
    abilities: Dex.abilities.all(),
    items: Dex.items.all(),
};

try {
    fs.writeFileSync('../data/dexData.json', JSON.stringify(dexData, null, 2));
    console.log('Dex data saved to dexData.json');
} catch (error) {
    console.error('Error writing dex data to file:', error);
}

console.log('Dex data saved to dexData.json');
