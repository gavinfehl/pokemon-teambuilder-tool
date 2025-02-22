// Pokemon Class
const { Dex } = require('pokemon-showdown');
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
        Serious:    {},
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
const GenDex = Dex.mod("gen"+generation);

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

        this.dex = GenDex.species.get(species)
        this.species = species;
        this.info = {
            name: name,
            gender: gender || this.dex.gender || "F",
            types: this.dex.types,
            tier: this.dex.tier,
            level: level,
            nature: nature,
            natureModifier: modifiers[nature],
            happiness: happiness,
            shiny: shiny, 
            facingRight: false,
            hiddenpowertype: hiddenpowertype,
            teratype: teratype,
            item: item,
            ability: ability || this.dex.abilities[0],
            potentialAbilities: this.dex.abilities,
            weight: this.dex.weight,
            bst: this.dex.baseStats.hp +this.dex.baseStats.atk +this.dex.baseStats.def +this.dex.baseStats.spa +this.dex.baseStats.spd +this.dex.baseStats.spe
        };
        this.baseStats = {
            hp:this.dex.baseStats.hp,
            attack:this.dex.baseStats.atk,
            defense:this.dex.baseStats.def,
            specialAttack:this.dex.baseStats.spa,
            specialDefense:this.dex.baseStats.spd,
            speed:this.dex.baseStats.spe,
          };
        this.ivs = ivs;
        this.evs = evs;
        this.learnset =this.dex.learnset;
        this.moveset = moveset;
        //TODO: ADD GENERATION SPECIFIC SPRITES
        this.displayinfo = {
            spriteRelativePath: (this.dex.exists) ? "node_modules/pokesprite-images/pokemon-gen7x/"+(shiny ? "shiny" : "regular")+(this.info.facingRight ? "/right" : "")+"/"+(this.species)+".png" : "node_modules/pokesprite-images/pokemon-gen7x/unknown-gen5.png",
            type1spriteRelativePath: "node_modules/pokesprite-images/misc/type-logos/gen8/"+this.dex.types[0]+".png",
            type2spriteRelativePath: "node_modules/pokesprite-images/misc/type-logos/gen8/"+this.dex.types[1]+".png",
        }
            this.effectiveStats = {
            hp:             calculateHP  (this.baseStats.hp,             this.ivs.hp,  this.evs.hp,  this.info.level),
            attack:         calculateStat(this.baseStats.attack,         this.ivs.atk, this.evs.atk, this.info.level, this.info.natureModifier.atk || 1),
            defense:        calculateStat(this.baseStats.defense,        this.ivs.def, this.evs.def, this.info.level, this.info.natureModifier.def || 1),
            specialAttack:  calculateStat(this.baseStats.specialAttack,  this.ivs.spa, this.evs.spa, this.info.level, this.info.natureModifier.spa || 1),
            specialDefense: calculateStat(this.baseStats.specialDefense, this.ivs.spd, this.evs.spd, this.info.level, this.info.natureModifier.spd || 1),
            speed:          calculateStat(this.baseStats.speed,          this.ivs.spe, this.evs.spe, this.info.level, this.info.natureModifier.spe || 1),
        };
    }
    
    /*
    required item(s?)
    effective stats
    forme(?)
    gmax?
    mega?
    */
    
    



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
               `SPECIES: ${this.species}\n` +
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