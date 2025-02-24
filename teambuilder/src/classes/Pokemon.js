// Pokemon Class
const modifiers = {     
    //SPICY
        Hardy:      {},
        Lonely:     { atk: 1.1, def: 0.9 },
        Brave:      { atk: 1.1, spe: 0.9 },
        Adamant:    { atk: 1.1, spa: 0.9 },
        Naughty:    { atk: 1.1, spd: 0.9 },
    //SOUR
        Bold:       { def: 1.1, atk: 0.9 },
        Docile:     {},
        Relaxed:    { def: 1.1, spe: 0.9 },
        Impish:     { def: 1.1, spa: 0.9 },
        Lax:        { def: 1.1, spd: 0.9 },
    //SWEET
        Timid:      { spe: 1.1, atk: 0.9 },
        Hasty:      { spe: 1.1, def: 0.9 },
        Serious:    { atk: 1, def: 1, spa: 1, spd: 1, spe: 1 },
        Jolly:      { spe: 1.1, spa: 0.9 },
        Naive:      { spe: 1.1, spd: 0.9 },
    //BITTER
        Modest:     { spa: 1.1, atk: 0.9 },
        Mild:       { spa: 1.1, def: 0.9 },
        Quiet:      { spa: 1.1, spe: 0.9 },
        Bashful:    {},
        Rash:       { spa: 1.1, spd: 0.9 },
    //DRY
        Calm:       { spd: 1.1, atk: 0.9 },
        Gentle:     { spd: 1.1, def: 0.9 },
        Sassy:      { spd: 1.1, spe: 0.9 },
        Careful:    { spd: 1.1, spa: 0.9 },
        Quirky:     {}, 
};
const generation = 7;
const format = 'gen7';
const usageDataJSON = require('@/data/parsedusagedata.json');
const movesetUsageJSON = require('@/data/parsedmovesetusagedata.json');
const pokespriteInfoJSON = require('@/data/pokespriteinfo.json'); 

// calculates the effective Atk, Def, SpA, SpD, or Spe stat as a result of a pokemon's attributes
function calculateStat(base, iv, ev, level, natureModifier) {
    return Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level / 100 + 5) * natureModifier);
}
// calculates the effective HP stat as a result of a pokemon's attributes
function calculateHP(base, iv, ev, level) {
    return Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level / 100) + level + 10);
}  
// Get nature description
function getNatureDescription(nature) {
    const modifier = modifiers[nature];
    if (!modifier) return `${nature} (Unknown Nature)`;

    const descriptions = {
        atk: "Atk",
        def: "Def",
        spa: "SpA",
        spd: "SpD",
        spe: "Spe"
    };

    const positive = Object.entries(modifier).find(([_, value]) => value > 1);
    const negative = Object.entries(modifier).find(([_, value]) => value < 1);

    if (!positive && !negative) {
        return `${nature} (Neutral Nature)`;
    }

    return `${nature} (+${descriptions[positive?.[0]] || "None"}, -${descriptions[negative?.[0]] || "None"})`;
}

async function getPokemonDex(format, species) {
    console.log("WELL YES GET DEX GOT CALLED with:!", format, species);
    const response = await fetch(`http://localhost:3000/dex/${format}/${species}`);
    if (response.ok) {
        const pokemonDex = await response.json();
        //console.log("DEX OUTPUT: ", pokemonDex);  // Should log the correct data
        return pokemonDex;
    } else {
        console.error('Failed to fetch data:', response.status);
        return null;
    }
    
}
// Pokemon class  
  
class Pokemon {
    constructor(species, 
                name = null,
                gender = null,
                ability = null,
                level = 100, 
                nature = "Serious",
                happiness = 255,
                shiny = false, 
                hiddenpowertype = 'Dark',
                teratype = 'Normal',
                item = null,
                ivs = { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
                evs = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
                moveset = {move1: null, move2: null, move3: null, move4: null,}
    ){

        this.dex = null;
        this.species = species;
        this.info = {
            name: name,
            natdexnumber: null,
            gender: gender || "F",
            types: null,
            tier: null,
            level: level,
            nature: nature,
            natureModifier: modifiers[nature],
            happiness: happiness,
            shiny: shiny, 
            facingRight: false,
            hiddenpowertype: hiddenpowertype,
            teratype: teratype,
            item: item,
            ability: ability || null,
            potentialAbilities: null,
            weight: null,
            bst: null
        };

        this.slug = null;
        this.baseStats = {
            hp:null,
            attack:null,
            defense:null,
            specialAttack:null,
            specialDefense:null,
            speed:null,
          };
        this.ivs = ivs;
        this.evs = evs;
        this.learnset = null;
        this.moveset = moveset;
        //TODO: ADD GENERATION SPECIFIC SPRITES
        this.displayinfo = {
            spriteRelativePath: null,
            type1spriteRelativePath: null,
            type2spriteRelativePath: null
        };
        this.effectiveStats = {
            hp:             null,
            attack:         null,
            defense:        null,
            specialAttack:  null,
            specialDefense: null,
            speed:          null
        };
        /*  UsageEntry: {
                usage: {
                rank: '33',
                name: 'Swampert-Mega',
                usage_percent: 5.9198,
                viability_ceiling: 'Common'
                },
                movesetUsage: {
                Pokemon: 'Swampert-Mega',
                Raw_count: '13219',
                'Avg._weight': '0.6525389859705429',
                Viability_Ceiling: '95',
                Abilities: [Array],
                Items: [Array],
                Spreads: [Array],
                Moves: [Array],
                'Tera Types': [Array],
                Teammates: [Array],
                'Checks and Counters': [Array]
                }
            }*/                               
        this.UsageEntry = {
            usage:   {
                "rank": null,
                "name": species,
                "usage_percent": null,
                "viability_ceiling": null
            },
            movesetUsage: {
                "Pokemon": species,
                "Raw_count": 0,
                "Avg._weight": 0,
                "Viability_Ceiling": 0,
                "Abilities": [],
                "Items": [],
                "Spreads": [],
                "Moves": [],
                "Tera Types": [],
                "Teammates": [],
                "Checks and Counters": []
            }
        };
        this.isInitialized = false;
    }
    async init(format, species) {
        console.log("Init passed in")
        this.dex = await getPokemonDex(format, species);
        if(this.dex == null){
            console.log("dex empty, failed to initialize");
            return;
        }
        //console.log("DEX OUTPUT: ", this.dex);  // Should log the correct data
        this.info = Object.assign({}, this.info,{
            natdexnumber: this.dex.num,
            gender: this.info.gender || this.dex.gender || "F",
            types: this.dex.types,
            tier: this.dex.tier,
            ability: this.info.ability || this.dex.abilities.base,
            potentialAbilities: this.dex.abilities,
            weight: this.dex.weight,
            bst: this.dex.baseStats.hp + this.dex.baseStats.atk + this.dex.baseStats.def + this.dex.baseStats.spa + this.dex.baseStats.spd + this.dex.baseStats.spe
        });
        this.slug = this.#findSlug(this.info.natdexnumber);
        this.baseStats = {
            hp:this.dex.baseStats.hp,
            attack:this.dex.baseStats.atk,
            defense:this.dex.baseStats.def,
            specialAttack:this.dex.baseStats.spa,
            specialDefense:this.dex.baseStats.spd,
            speed:this.dex.baseStats.spe,
          };
        this.learnset =this.dex.learnset;
        //TODO: ADD GENERATION SPECIFIC SPRITES
        this.displayinfo = {
            spriteRelativePath: (this.dex.exists) ? "pokesprite-images/pokemon-gen7x/"+(this.shiny ? "shiny" : "regular")+(this.info.facingRight ? "/right" : "")+"/"+(this.slug)+".png" : "node_modules/pokesprite-images/pokemon-gen7x/unknown-gen5.png",
            type1spriteRelativePath: "pokesprite-images/misc/type-logos/gen8/"+this.dex.types[0]+".png",
            type2spriteRelativePath: "pokesprite-images/misc/type-logos/gen8/"+this.dex.types[1]+".png",
        };
        this.effectiveStats = {
            hp:             calculateHP  (this.baseStats.hp,             this.ivs.hp,  this.evs.hp,  this.info.level),
            attack:         calculateStat(this.baseStats.attack,         this.ivs.atk, this.evs.atk, this.info.level, this.info.natureModifier.atk || 1),
            defense:        calculateStat(this.baseStats.defense,        this.ivs.def, this.evs.def, this.info.level, this.info.natureModifier.def || 1),
            specialAttack:  calculateStat(this.baseStats.specialAttack,  this.ivs.spa, this.evs.spa, this.info.level, this.info.natureModifier.spa || 1),
            specialDefense: calculateStat(this.baseStats.specialDefense, this.ivs.spd, this.evs.spd, this.info.level, this.info.natureModifier.spd || 1),
            speed:          calculateStat(this.baseStats.speed,          this.ivs.spe, this.evs.spe, this.info.level, this.info.natureModifier.spe || 1),
        };              
        this.UsageEntry = {
            usage: this.#findUsageEntry(this.species),
            movesetUsage: this.#findMovesetUsageEntry(this.species)
        };
        this.isInitialized = true;
        //console.log("Pokemon initialized:\n"+this.toString());
    }
    #findUsageEntry(species) {
        try {
            const data = usageDataJSON;
            const entry = data.find(entry => entry.name === species);
            if (!entry) {
                console.warn(`No usage data found for species: ${species}`);
            }
            return entry;
        } catch (err) {
            console.error('Error reading moveset usage data file for:', species, "error:", err);
            return null;
        }
    }

    #findSlug(natdexnumber) {
        try {
            const data = pokespriteInfoJSON;
            
            // Ensure the natdexnumber is a string (since the keys are strings like "001", "002")
            const idxString = natdexnumber.toString().padStart(3, '0');
            
            // Check if the idx exists in the data
            const entry = data[idxString];
            
            if (!entry) {
                console.warn(`No slug data found for idx: ${natdexnumber}`);
                return null;
            }
            
            // Return the slug in English (can be changed to any language like 'jpn' for Japanese)
            return entry.slug.eng;
        } catch (err) {
            console.error('Error reading slug data file for:', natdexnumber, "error:", err);
            return null;
        }
    }

    #findMovesetUsageEntry(species) {
        try {
            const data = movesetUsageJSON;
            const entry = data.find(entry => entry.Pokemon === species);
            if (!entry) {
                console.warn(`No moveset usage data found for species: ${species}`);
            }
            return entry;
        } catch (err) {
            console.error('Error reading moveset usage data file for:', species, "error:", err);
            return null;
        }
    }
    
    async waitForInit() {
        while (!this.initialized) {
            await new Promise(resolve => setTimeout(resolve, 10));
        }
    }

    async getUsageData() {
        await this.waitForInit();
        return this.UsageEntry.usage;
    }

    async getMovesetUsageData() {
        await this.waitForInit();
        return this.UsageEntry.movesetUsage;
    }

    async getSpriteBase64() {
        await this.waitForInit();
        try {
            const response = await fetch(spriteRelativePath);
            const buffer = await response.arrayBuffer();
            const base64String = Buffer.from(buffer).toString('base64');
            console.log(`data:image/png;base64,${base64String}`);
            return `data:image/png;base64,${base64String}`;
        } catch (error) {
            console.error('Error converting image to Base64:', error);
            return null;
        }
    }
    /*
    required item(s?)
    effective stats
    forme(?)
    gmax?
    mega?
    */
    
    


    toFullJSON() {
        return {
            species: this.species,
            slug: this.slug,
            info: this.info,
            baseStats: this.baseStats,
            ivs: this.ivs,
            evs: this.evs,
            learnset: this.learnset,
            moveset: this.moveset,
            displayinfo: this.displayinfo,
            effectiveStats: this.effectiveStats,
            UsageEntry: this.UsageEntry
        };
    }
    // Methods
    toJSON() { 
        return {
            name: this.species,
            species: this.species,
            item: this.info.item,
            ability: this.info.ability,
            gender: this.info.gender,
            nature: this.info.nature,
            evs: this.evs,
            ivs: this.ivs,
            moves: Object.values(this.moveset).filter(move => move !== null),
            level: this.info.level,
        };
    }


    toString() {
        let evstring = "";
        for (const stat in this.evs) {
            if (this.evs[stat] != 0){
                evstring += `${stat.toUpperCase()}: ${this.evs[stat]}, `;
            }
        }
        let ivstring = "";
        for (const stat in this.ivs) {
            if (this.ivs[stat] != 0 || true){
                ivstring += `${stat.toUpperCase()}: ${this.ivs[stat]}, `;
            }
        }
        let movesetstring = "";
        for (const move in this.moveset) {
            if (this.moveset[move] != null){
                movesetstring += (this.moveset[move]+", ");
            }
        }
        return '========================================\n' +
               `NAME: ${this.info.name}\n` +
               `SPECIES: ${this.species} (${this.info.natdexnumber})\n` +
               `ITEM: ${this.info.item}\n` +
               `ABILITY: ${this.info.ability}\n` +
               `GENDER: ${this.info.gender}\n` +
               `TIER: ${this.info.tier}\n` +
               `NATURE: ${getNatureDescription(this.info.nature)}\n` +
               `TYPE${(this.info.types[1]==undefined ? "" : "S")}: ${this.info.types[0]||"None"}, ${this.info.types[1]||"None"}\n` +
               '----------------------------------------\n' +
               `HP : ${this.effectiveStats.hp}\n` +
               `ATK: ${this.effectiveStats.attack}\n` +
               `DEF: ${this.effectiveStats.defense}\n` +
               `SPA: ${this.effectiveStats.specialAttack}\n` +
               `SPD: ${this.effectiveStats.specialDefense}\n` +
               `SPE: ${this.effectiveStats.speed}\n` +
               '----------------------------------------\n' +
               `EVS: ` + evstring + "\n" +
               `IVS: ` + ivstring + "\n" +
               '----------------------------------------\n' +
               `MOVES: ` + movesetstring + "\n" +
               '----------------------------------------\n' +
               `BST: ${this.info.bst}\n` +
               `SPRITERELPATH: ${this.displayinfo.spriteRelativePath}\n` +
               '========================================\n';
    }
}

module.exports = Pokemon