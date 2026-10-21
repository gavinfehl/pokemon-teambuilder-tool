// server.js
const express = require('express');
const { Dex } = require('@pkmn/dex');
const { Generations } = require('@pkmn/data');
const { Teams, Sets } = require('@pkmn/sets');
const app = express();
const port = 3001;
const cors = require('cors');
app.use(cors());
app.use(express.json());

const gens = new Generations(Dex);

app.get('/dex/:generation/:species', async (req, res) => {
    const { generation, species } = req.params;
    const gen = gens.get(parseInt(generation));
    const speciesData = gen.species.get(species);
    if (!speciesData.exists) {
        return res.status(404).json({ error: 'Pokemon not found' });
    }
    const learnsetData = await gen.learnsets.get(speciesData.id);
    const pokemonData = {
        exists: speciesData.exists,
        isNonStandard: speciesData.isNonstandard,
        baseSpecies: speciesData.baseSpecies,
        forme: speciesData.forme,
        num: speciesData.num,
        gender: speciesData.gender,
        types: [...speciesData.types],
        tier: speciesData.tier,
        abilities: {
            base: speciesData.abilities['0'],
            alternate: speciesData.abilities['1'],
            hidden: speciesData.abilities['H'],
        },
        baseStats: {
            hp:  speciesData.baseStats.hp,
            atk: speciesData.baseStats.atk,
            def: speciesData.baseStats.def,
            spa: speciesData.baseStats.spa,
            spd: speciesData.baseStats.spd,
            spe: speciesData.baseStats.spe,
        },
        weight: speciesData.weightkg,
        learnset: learnsetData?.learnset ?? {},
    };
    res.json(pokemonData);
});

app.post('/importteam', (req, res) => {
    const { json } = req.body;
    if (!json) {
        return res.status(404).json({ error: 'import json was null' });
    }
    const teamObj = Teams.importTeam(json);
    const teamImport = {
        teamJSON: teamObj.team,
        teamPackedString: Teams.packTeam(teamObj),
    };
    res.json(teamImport);
});


app.post('/exportteam', (req, res) => {
    const { adv, normal } = req.body;
    if (!adv || adv.length === 0) {
        return res.status(404).json({ error: 'pokemons was null or team was empty' });
    }
    const teamExport = {
        teamJSON: normal,
        teamExportString: normal.map((s: any) => Sets.exportSet(s)).join('\n'),
        teamPackedString: Teams.packTeam({ team: normal }),
        teamAdvancedJSON: adv,
    };
    res.json(teamExport);
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
