'use client';
import React, { useEffect, useState } from 'react';
import { PokemonSet, PokemonTeam } from '@/classes/PokemonSet';
import TestGraph from '@/components/ui/testgraph'; // Adjust the import path as necessary
import "../css/sandbox.scss";

// Define team globally

export default function Sandbox() {
    const [loading, setLoading] = useState(true); // Loading state for when the team is being fetched
    const [error, setError] = useState<string | null>(null); // Error state to capture any issues
    const [team, setTeam] = useState(new PokemonSet());
    const importString = `Landorus-Therian @ Alakazite  
                            Ability: Trace  
                            EVs: 4 Def / 252 SpA / 252 Spe  
                            Timid Nature  
                            IVs: 0 Atk  
                            - Psychic  
                            - Grass Knot  
                            - Signal Beam  
                            - Recover  

                            Tapu Lele  
                            Ability: Psychic Surge  
                            EVs: 252 SpA / 4 SpD / 252 Spe  
                            Timid Nature  
                            IVs: 0 Atk  
                            - Wonder Room  
                            - Moonblast  
                            - Psyshock  
                            - Focus Blast  

                            Xurkitree @ Normalium Z  
                            Ability: Beast Boost  
                            EVs: 252 SpA / 4 SpD / 252 Spe  
                            Timid Nature  
                            IVs: 0 Atk  
                            - Tail Glow  
                            - Nature Power  
                            - Energy Ball  
                            - Thunderbolt  

                            Magearna @ Assault Vest  
                            Ability: Soul-Heart  
                            EVs: 248 HP / 72 Def / 188 SpD  
                            Calm Nature  
                            IVs: 0 Atk  
                            - Fleur Cannon  
                            - Ice Beam  
                            - Hidden Power [Fire]  
                            - Volt Switch  

                            Skarmory @ Weakness Policy  
                            Ability: Weak Armor  
                            EVs: 4 HP / 252 Atk / 252 Spe  
                            Jolly Nature  
                            - Swords Dance  
                            - Iron Head  
                            - Brave Bird  
                            - Roost  

                            Hawlucha @ Psychic Seed  
                            Ability: Unburden  
                            EVs: 252 Atk / 4 SpD / 252 Spe  
                            Adamant Nature  
                            - Acrobatics  
                            - Swords Dance  
                            - High Jump Kick  
                            - Roost`; // Sample team data
    const debugSpeciesList = [
        "Magearna", "Landorus-Therian", "Toxapex", "Kartana", "Charizard-Mega-X", "Heatran",
        "Gliscor", "Latias-Mega", "Kyurem-Black", "Chansey", "Tapu Koko", "Tornadus-Therian", 
        "Serperior", "Greninja", "Ferrothorn", "Greninja-Ash", "Volcarona", "Cresselia", "Tapu Lele", 
        "Diancie-Mega", "Medicham-Mega", "Weavile", "Kommo-o", "Excadrill", "Alakazam-Mega", "Mawile-Mega", 
        "Clefable", "Rotom-Wash", "Hawlucha", "Manaphy", "Swampert-Mega", "Tyranitar-Mega", "Tapu Fini", 
        "Victini", "Scizor-Mega", "Slowbro", "Lopunny-Mega", "Charizard-Mega-Y", "Garchomp", "Seismitoad", 
        "Skarmory", "Latios-Mega", "Tapu Bulu", "Pelipper", "Dragonite", "Ditto", "Hydreigon", "Slowbro-Mega", 
        "Kyurem", "Zapdos", "Gastrodon", "Garchomp-Mega", "Celesteela", "Hoopa-Unbound", "Gyarados-Mega", 
        "Heracross-Mega", "Reuniclus", "Thundurus-Therian", "Pinsir-Mega", "Sableye-Mega", "Hippowdon", "Jirachi", 
        "Magnezone", "Keldeo", "Volcanion", "Gyarados", "Tyranitar", "Blacephalon", "Crawdaunt", "Moltres", 
        "Aggron-Mega", "Marowak-Alola", "Alomomola", "Necrozma", "Mew", "Venusaur-Mega", "Breloom", "Amoonguss", 
        "Tangrowth", "Gengar", "Aerodactyl-Mega", "Krookodile", "Bisharp", "Kingdra", "Manectric-Mega", "Altaria-Mega", 
        "Buzzwole", "Pyukumuku", "Mantine", "Salamence", "Bronzong", "Ninetales-Alola", "Azumarill", "Suicune", 
        "Gallade-Mega", "Porygon-Z", "Camerupt-Mega"];
      

    useEffect(() => {
        // Function to fetch and set team data
        const initializePokemonSet = async () => {
            try {
                setTeam(new PokemonSet("graphtestteam"));
                console.log('PokemonTeam initialized'); // Debugging point

                // Add Pokémon to the team
                console.log('Fetching team data from:', importString);
                for (const species of debugSpeciesList) {
                    await team.addPokemonFromSpecies(species);
                    console.log('Pokémon added:', species); // Debugging point
                }
/*                 await team.exportTeam();
                console.log("ADVJSON:", team.teamAdvancedJSON); */
                //setTeamData(team.teamAdvancedJSON); // Set the fetched team data
                console.log("IMAGE PATHS:", team.toImages());
                setTeam(team); // keep react in the loop?
                setLoading(false); // Change loading state after data is fetched
            } catch (err) {
                console.error('Error fetching team data:', err);
                setError('Failed to load team data.');
                setLoading(false);
            }
        };

        initializePokemonSet(); // Run the fetch function when component mounts
    }, []);

    return (
        <div className="sandbox-container">
            <h1 className="sandbox-title">GRAPHTESTPAGE</h1>
            <TestGraph team={team} />
        </div>
    );
}
