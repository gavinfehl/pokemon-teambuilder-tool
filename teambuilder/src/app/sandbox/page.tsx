'use client';
import React, { useEffect, useState } from 'react';
import { PokemonTeam } from '@/classes/PokemonSet';
import './sandbox.css'; // Assuming you will add this CSS for styles

// Define team globally
const team = new PokemonTeam();

export default function Sandbox() {
    let [teamData, setTeamData] = useState<any>(null); // State for the team data as JSON
    const [loading, setLoading] = useState(true); // Loading state for when the team is being fetched
    const [error, setError] = useState<string | null>(null); // Error state to capture any issues
    const importString = `Alakazam-Mega @ Alakazite  
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

    useEffect(() => {
        // Function to fetch and set team data
        const fetchTeamData = async () => {
            try {
                console.log('PokemonTeam initialized'); // Debugging point

                // Add Pokémon to the team
                console.log('Fetching team data from:', importString);
                //await team.addPokemonFromSpecies("Charizard");
                await team.importTeam(importString); // Import the team data

                console.log('Pokémon added:', team); // Debugging point
                
                // Export the team
                let teamExports = await team.exportTeam();
                console.log('Exported team:', teamExports); // Debugging point

                //setTeamData(team.teamAdvancedJSON); // Set the fetched team data
                teamData = team.teamAdvancedJSON;
                console.log("TEAM DATA OUTPUT: ", teamData);

                console.log("IMAGE PATHS:", team.toImages());

                setLoading(false); // Change loading state after data is fetched
            } catch (err) {
                console.error('Error fetching team data:', err);
                setError('Failed to load team data.');
                setLoading(false);
            }
        };

        fetchTeamData(); // Run the fetch function when component mounts
    }, []);

    // Function to manually set the team data
    const updateTeamData = (data: string) => {
        setTeamData(data);
        setLoading(false);
    };
    
    return (
        <div className="sandbox-container">
            <h1 className="sandbox-title">Sandbox Page</h1>
            <div className="team-info">
                <h2 className="team-heading">Your Pokémon Team</h2>
                {loading ? (
                    <p className="loading-text">Loading your team...</p>
                ) : error ? (
                    <p className="error-text">{error}</p> // Show error if any
                ) : (
                    <div>
                        
                        <div>{teamData}</div>
                        <div className="flex flex-row space-x-4">
                            {team.toImages().map((src, index) => (
                                <img key={index} src={src} alt={`Pokemon ${index + 1}`} className="w-48 h-48" />
                            ))}
                        </div>
                        <div><h1>After images</h1></div>
                        <button 
                            className="set-team-button" 
                            onClick={() => updateTeamData('{"customTeam": "data"}')}
                        >
                            Set Custom Team Data
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
