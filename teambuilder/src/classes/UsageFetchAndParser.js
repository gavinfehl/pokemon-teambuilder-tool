import { Dex } from '@pkmn/dex';
import { Generations } from '@pkmn/data';
import { Smogon } from '@pkmn/smogon';

const gens = new Generations(Dex);
const smogon = new Smogon(fetch);

class UsageFetchAndParser {
  constructor(genNumber = 7, format = "gen7ou") {
    this.format = format;
    this.gen = gens.get(genNumber);
  }

  /**
   * Fetches usage statistics for the specified generation and format
   */
  async #fetchUsageStats(species) {
    try {
      const stats = await smogon.stats(this.gen, species, this.format);
      return stats;
    } catch (error) {
      console.error(`Error fetching usage stats for ${species}:`, error);
      return null;
    }
  }

  /**
   * Fetches moveset statistics for the specified generation, format, and Pokémon
   */
  async #fetchMovesetUsageStats(species) {
    try {
      const movesets = await smogon.sets(this.gen, species, this.format);
      return movesets;
    } catch (error) {
      console.error(`Error fetching moveset usage stats for ${species}:`, error);
      return null;
    }
  }

  /**
   * Parses usage stats data from the API
   */
  processUsageStats(stats) {
    if (!stats || !stats.data) {
      throw new Error("No stats data available");
    }

    const usageEntry = [];
    
    // Sort by usage percentage descending to assign proper ranks
    const sortedPokemon = Object.entries(stats.data).sort((a, b) => {
      return b[1].usage - a[1].usage;
    });

    // Process each Pokémon's data
    for (let i = 0; i < sortedPokemon.length; i++) {
      const [pokemon, data] = sortedPokemon[i];
      const usagePercent = data.usage * 100; // Convert to percentage
      
      // Calculate viability ceiling
      const viabilityCeiling = this.#getViabilityCeiling(usagePercent)
      
      usageEntry.push({
        rank: (i + 1).toString(),
        name: pokemon,
        usage_percent: usagePercent.toFixed(2),
        viability_ceiling: viabilityCeiling
      });
    }
    
    return usageEntry;
  }

  /**
   * Processes moveset usage data for a specific Pokémon
   */
  processMovesetUsageStats(pokemon, movesetData) {
    if (!movesetData) {
      console.warn(`No moveset data available for ${pokemon}`);
      return null;
    }

    const result = {
      Pokemon: pokemon,
      Raw_count: movesetData.usage?.raw || 0,
      Avg_weight: movesetData.usage?.weighted || 0,
      Viability_Ceiling: this.getViabilityCeiling(movesetData.usage?.weighted * 100 || 0)
    };

    // Process abilities
    if (movesetData.abilities) {
      result.Abilities = Object.entries(movesetData.abilities).map(([ability, usage]) => ({
        item: ability,
        value: `${(usage * 100).toFixed(2)}%`
      }));
    } else {
      result.Abilities = [];
    }

    // Process items
    if (movesetData.items) {
      result.Items = Object.entries(movesetData.items).map(([item, usage]) => ({
        item: item,
        value: `${(usage * 100).toFixed(2)}%`
      }));
    } else {
      result.Items = [];
    }

    // Process spreads (this will need adaptation based on data format)
    result.Spreads = [];
    if (movesetData.spreads) {
      for (const [spread, usage] of Object.entries(movesetData.spreads)) {
        result.Spreads.push({
          item: spread,
          value: `${(usage * 100).toFixed(2)}%`
        });
      }
    }

    // Process moves
    if (movesetData.moves) {
      result.Moves = Object.entries(movesetData.moves).map(([move, usage]) => ({
        item: move,
        value: `${(usage * 100).toFixed(2)}%`
      }));
    } else {
      result.Moves = [];
    }

    // Process Tera Types (for Gen 9)
    result["Tera Types"] = [];
    if (movesetData.teraTypes) {
      for (const [type, usage] of Object.entries(movesetData.teraTypes)) {
        result["Tera Types"].push({
          item: type,
          value: `${(usage * 100).toFixed(2)}%`
        });
      }
    }

    // Process teammates
    result.Teammates = [];
    if (movesetData.teammates) {
      for (const [teammate, usage] of Object.entries(movesetData.teammates)) {
        result.Teammates.push({
          item: teammate,
          value: `${(usage * 100).toFixed(2)}%`
        });
      }
    }

    // Process checks and counters
    result["Checks and Counters"] = [];
    if (movesetData.counters) {
      for (const [counter, data] of Object.entries(movesetData.counters)) {
        result["Checks and Counters"].push({
          pokemon: counter.replace(' ', '-'),
          matchup_occurred: data.count || 0,
          counter_kos_or_forces_switch_percent: ((data.ko || 0) * 100).toFixed(2),
          stdevofkoswitch: data.stddev ? data.stddev.toFixed(2) : "0.00",
          ko_percent: `${((data.koed || 0) * 100).toFixed(2)}%`,
          switch_out_percent: `${((data.switched || 0) * 100).toFixed(2)}%`
        });
      }
    }

    return result;
  }

  /**
   * Calculate viability ceiling based on usage percentage
   */
  #getViabilityCeiling(usagePercent) {
    return usagePercent >= 25 ? 'Centralizing' :
           usagePercent >= 15 ? 'Very Popular' :
           usagePercent >= 8 ? 'Popular' :
           usagePercent >= 4 ? 'Common' :
           usagePercent >= 2 ? 'Notable' :
           usagePercent >= 1 ? 'Uncommon' :
           usagePercent >= 0.2 ? 'Rare' : 'Very Rare';
  }

  /**
   * Fetch and process usage stats
   */
  async getUsageEntry(species) {
    const stats = await this.#fetchUsageStats();
    if (!stats) {
      throw new Error(`Failed to get usage stats for ${this.format}`);
    }
    return this.processUsageStats(stats);
  }

  /**
   * Fetch and process moveset stats for all Pokémon in the usage stats
   */
  async getMovesetUsageEntry(species) {
    const stats = await this.#fetchMovesetUsageStats();
    if (!stats) {
      throw new Error("No usage stats available to fetch movesets");
    }    
    return this.processMovesetUsageStats(stats);
  }

   /* Save data to JSON file (if needed for backward compatibility)

  saveToJson(data, outputFile) {
    if (!data.length) {
      throw new Error("No data to save");
    }
    
    const fs = require('fs');
    fs.writeFileSync(outputFile, JSON.stringify(data, null, 2), 'utf8');
    console.log(`Data saved to ${outputFile}`);
  } */

}

// Export the class for use in other modules
export default UsageFetchAndParser;