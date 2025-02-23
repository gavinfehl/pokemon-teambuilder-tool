// server.js
const express = require('express');
const { exists } = require('fs');
const showdown = require('pokemon-showdown');
const app = express();
const port = 3000;

app.get('/dex/:format/:species', (req, res) => {
    const { format, species } = req.params;
    const genDex = showdown.Dex.mod(format).species.get(species); // e.g., 'gen7'
    if (!genDex) {
        return res.status(404).json({ error: 'Pokemon not found' }); // Handle cases where the pokemon doesn't exist
    }
    const pokemonData = {
        exists: genDex.exists,
        isNonStandard: genDex.isNonstandard,
        num: genDex.num,
        gender: genDex.gender,
        types: genDex.types,
        tier: genDex.tier,
        abilities:{
            base: genDex.abilities['0'],
            alternate: genDex.abilities['1'],
            hidden: genDex.abilities['H'],
        },
        baseStats: {
            hp:genDex.baseStats.hp,
            atk:genDex.baseStats.atk,
            def:genDex.baseStats.def,
            spa:genDex.baseStats.spa,
            spd:genDex.baseStats.spd,
            spe:genDex.baseStats.spe,
        },
        weight: genDex.weight,
        learnset: genDex.learnset,
    }
    console.log(pokemonData);
    res.json(pokemonData);
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});