// server.js
const express = require('express');
const showdown = require('pokemon-showdown');
const app = express();
const port = 3000;
const cors = require('cors');
app.use(cors()); // Enable CORS for all routes

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
    //console.log(pokemonData);
    res.json(pokemonData);
});

app.use(express.json()); // Ensure Express can parse JSON body
app.post('/importteam', (req, res) => {
    const { json } = req.body; // Get from request body instead of query
    if (!json) {
        return res.status(404).json({ error: 'import json was null' });
    }
    importJSON = showdown.Teams.import(json);

    const teamImport = {
        teamJSON: importJSON,
        teamPackedString: showdown.Teams.pack(importJSON),
    };

    console.log("TEAM IMPORT FROM SERVER: ", teamImport.teamJSON);

    res.json(teamImport);

    
});

app.use(express.json()); // Ensure Express can parse JSON body
app.post('/exportteam', (req, res) => {
    const { adv, normal } = req.body; // Get from request body instead of query
    if (!adv || adv.length === 0) {
        return res.status(404).json({ error: 'pokemons was null or team was empty' });
    }

    const teamExport = {
        teamJSON: normal,
        teamExportString: showdown.Teams.export(normal),
        teamPackedString: showdown.Teams.pack(normal),
        teamAdvancedJSON: adv
    };

    //console.log("teamExport:", teamExport);
    res.json(teamExport);
});


app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});