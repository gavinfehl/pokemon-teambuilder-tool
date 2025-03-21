// Pokemon Class
import UsageFetchAndParser from "./UsageFetchAndParser";
import {
	BattlePokemonSprites, BattlePokemonIconIndexes, BattlePokemonIconIndexesLeft
} from '@/data/battle-dex-data'

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
const typeColours = {
	normal: '#A8A77A',
	fire: '#EE8130',
	water: '#6390F0',
	electric: '#F7D02C',
	grass: '#7AC74C',
	ice: '#96D9D6',
	fighting: '#C22E28',
	poison: '#A33EA1',
	ground: '#E2BF65',
	flying: '#A98FF3',
	psychic: '#F95587',
	bug: '#A6B91A',
	rock: '#B6A136',
	ghost: '#735797',
	dragon: '#6F35FC',
	dark: '#705746',
	steel: '#B7B7CE',
	fairy: '#D685AD',
};
//const usageDataJSON = require('@/data/parsedusagedata.json');
//const movesetUsageJSON = require('@/data/parsedmovesetusagedata.json');
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

async function getPokemonDex(generation, species) {
    console.log("dex called with:!", generation, species);                                                      //zygarde 10% v
    const response = await fetch(`http://localhost:3000/dex/${generation}/${species.replace("Kommo-O", "Kommo-o").replace("%", "")}`);
    if (response.ok) {
        const pokemonDex = await response.json();
        //console.log("DEX OUTPUT: ", pokemonDex);  // Should log the correct data
        return pokemonDex;
    } else {
        console.error('Failed to fetch dex data:', response.status);
        return null;
    }
}
async function getUsage(format, species) {
    //console.log("Usage called with:", format, species);
    const response = await fetch(`https://pkmn.github.io/smogon/data/stats/${format}.json`);
    if (response.ok) {
        const data = await response.json();
        const usage = data.pokemon[species.replace("Kommo-O", "Kommo-o").replace("%", "")];  // Access the usage data using the species name as a key
        if (usage) {
            console.log("DATA OUTPUT:", data);  // Logs the entire data
            console.log("USAGE OUTPUT:", usage);  // Logs the usage data for the specified species
            return usage;
        } else {
            console.error(`Species (${species}) not found in usage data.`);
            return null;
        }
    } else {
        console.error('Failed to fetch usage data:', response.status);
        return null
    }
}

// Pokemon class  
  
class Pokemon {
    constructor(species,
                generation,
                format, 
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
        this.generation = generation;
        this.format = format;
        this.dex = null;
        this.usage = {
            //usageDataJSON: require('@/data/parsedusagedata.json'),
            //movesetUsageJSON: require('@/data/parsedmovesetusagedata.json'),
            "rank": null,
            "usage": {
                "raw": 0,
                "real": 0,
                "weighted": 0,
            },
            "abilities": {},
            "items": {},
            "spreads": {},
            "moves": {},
            "teraTypes": {},
            "teammates": {},
            "checks": {}
        };
        this.species = species;
        this.baseSpecies = null;
        this.forme = null;
        this.info = {
            name: name,
            natdexnumber: null,
            gender: gender || "F",
            types: {type1:"", type2:""},
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
            spritesheetCoords: null,
            type1spriteRelativePath: null,
            type2spriteRelativePath: null,
            type1color: '#666666',
            type2color: '#666666',
        };
        this.effectiveStats = {
            hp:             null,
            attack:         null,
            defense:        null,
            specialAttack:  null,
            specialDefense: null,
            speed:          null
        };                        
        this.isInitialized = false;
    }
    async init() {
        //console.log("Init passed in")
        this.dex = await getPokemonDex(this.generation, this.species);
        this.usage = await getUsage(this.format, this.species);
        //console.log("THISDOTUSAGE:", this.usage);
        this.baseSpecies = this.dex.baseSpecies;
        this.forme = this.dex.forme;
        //console.log(this.species, "'s form is:", this.forme);
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
        this.slug = this.#findSlug(this.info.natdexnumber, this.forme);
        if(!this.slug){
            this.slug = (this.species.replace(" ", "-").toLowerCase())
        }
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
            spriteRelativePath: (this.dex.exists) ? "pokesprite-images/pokemon-"+(this.format==='gen8'?'gen8':'gen7x')+"/"+(this.shiny ? "shiny" : "regular")+(this.info.facingRight ? "/right" : "")+"/"+(this.slug)+".png" : "node_modules/pokesprite-images/pokemon-gen7x/unknown-gen5.png",
            spritesheetCoords: this.getSpriteCoords(),
            type1spriteRelativePath: "pokesprite-images/misc/type-logos/gen8/"+this.dex.types[0]+".png",
            type2spriteRelativePath: "pokesprite-images/misc/type-logos/gen8/"+this.dex.types[1]+".png",
            type1color: this.info.types[0] ? this.#findTypeColor(this.info.types[0].toLowerCase()) : '#666666',
            type2color: this.info.types[1] ? this.#findTypeColor(this.info.types[1].toLowerCase()) : (this.info.types[0] ? this.#findTypeColor(this.info.types[0].toLowerCase()) : '#666666'),
        };
        console.log(this.displayinfo.spriteRelativePath);
        this.effectiveStats = {
            hp:             calculateHP  (this.baseStats.hp,             this.ivs.hp,  this.evs.hp,  this.info.level),
            attack:         calculateStat(this.baseStats.attack,         this.ivs.atk, this.evs.atk, this.info.level, this.info.natureModifier.atk || 1),
            defense:        calculateStat(this.baseStats.defense,        this.ivs.def, this.evs.def, this.info.level, this.info.natureModifier.def || 1),
            specialAttack:  calculateStat(this.baseStats.specialAttack,  this.ivs.spa, this.evs.spa, this.info.level, this.info.natureModifier.spa || 1),
            specialDefense: calculateStat(this.baseStats.specialDefense, this.ivs.spd, this.evs.spd, this.info.level, this.info.natureModifier.spd || 1),
            speed:          calculateStat(this.baseStats.speed,          this.ivs.spe, this.evs.spe, this.info.level, this.info.natureModifier.spe || 1),
        };           
        this.isInitialized = true;
        //console.log("Pokemon initialized:\n"+this.toString());
    }

    #findSlug(natdexnumber, forme) {
        try {
          // Ensure the natdexnumber is a string (padded with leading zeros)
          const idxString = natdexnumber.toString().padStart(3, '0');
          
          // Check if the idx exists in the data
          const entry = pokespriteInfoJSON[idxString];
          if (!entry) {
            console.warn(`No slug data found for idx: ${natdexnumber}`);
            return null;
          }
          
          // Get the base slug
          const baseSlug = entry.slug.eng;
          
          // If no forme is specified, return the base slug
          if (!forme || forme === '$') {
            return baseSlug;
          }

          // if forme exists
          return `${baseSlug}-${forme}`;

        } catch (err) {
          console.error('Error reading slug data file for:', natdexnumber, "error:", err);
          return null;
        }
    }
    #findTypeColor(type) {
        try {
            const color = typeColours[type];
            
            if (!color) {
                console.warn(`No type color data found for type: ${type}`);
                return '#666666'; // Default color if type not found
            }
            
            return color;
        } catch (err) {
            console.error('Error reading type color data for:', type, "error:", err);
            return '#666666'; // Default color in case of error
        }
    }
    
    async waitForInit() {
        while (!this.isInitialized) {
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
            //console.log(`data:image/png;base64,${base64String}`);
            return `data:image/png;base64,${base64String}`;
        } catch (error) {
            console.error('Error converting image to Base64:', error);
            return null;
        }
    }
    // snatched up from pokemon showdown
    getSpriteCoords() {
		let id = this.slug.replace("-", "").replace("-", "").toLowerCase();
		//if (this.forme!=="$" && this.forme) id = this.toID(this.species+this.forme);
		//if (this.species) id = toID(this.species);
/* 		if (pokemon?.volatiles?.formechange && !pokemon.volatiles.transform) {
			id = toID(pokemon.volatiles.formechange[1]);
		} */
        console.log(`ID of ${this.species}: ${id}`)
		let num = this.getPokemonIconNum(id, this.info.gender === 'F', !this.info.facingRight);
        console.log(`NUM of ${this.species}: ${num}`)
		let top = Math.floor(num / 12) * 30;
		let left = (num % 12) * 40;
		let fainted = ``;
        console.log(`SS POS of ${this.species}: -${left}px -${top}px${fainted}`)
		return [-left, -top];
	}
    getPokemonIconNum(id, isFemale, facingLeft) {
		let num = 0;
		if (BattlePokemonSprites?.[id]?.num) {
			num = BattlePokemonSprites[id].num;
		} /* else if (BattlePokedex?.[id]?.num) {
			num = BattlePokedex[id].num;
		} */
		if (num < 0) num = 0;
		if (num > 1025) num = 0;

        if (BattlePokemonIconIndexes?.[id]) {
			num = BattlePokemonIconIndexes[id];
		}
		if (isFemale) {
			if (['unfezant', 'frillish', 'jellicent', 'meowstic', 'pyroar'].includes(id)) {
				num = BattlePokemonIconIndexes[id + 'f'];
			}
		}
		if (facingLeft) {
			if (BattlePokemonIconIndexesLeft[id]) {
				num = BattlePokemonIconIndexesLeft[id];
			}
		}

		return num;
	}
    /*required item (s?) gmax?*/


    //========================EXPORT METHODS================================================================================================//
    // JSON which is used for advanced export (with dex fetched information)
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
    // To the basic JSON that showdown Teams parses
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
    // Prints info about this pokemon
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
               `TYPE${(this.info.types.type1==undefined ? "" : "S")}: ${this.info.types[0]||"None"}, ${this.info.types.type2||"None"}\n` +
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

export default Pokemon;