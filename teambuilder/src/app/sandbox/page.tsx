'use client';
import React, { useEffect, useState } from 'react';
import { PokemonTeam } from '@/classes/PokemonSet';
import './sandbox.css'; // Assuming you will add this CSS for styles

export default function Sandbox() {
    const [teamData, setTeamData] = useState<string | null>(null); // State for the team data
    const [loading, setLoading] = useState(true); // Loading state for when the team is being fetched
    const [error, setError] = useState<string | null>(null); // Error state to capture any issues
    const importString = `Articuno @ Leftovers
    Ability: Pressure
    EVs: 252 HP / 252 SpA / 4 SpD
    Modest Nature
    IVs: 30 SpA / 30 SpD
    - Ice Beam
    - Hurricane
    - Substitute
    - Roost

    Ludicolo @ Life Orb
    Ability: Swift Swim
    EVs: 4 HP / 252 SpA / 252 Spe
    Modest Nature
    - Surf
    - Giga Drain
    - Ice Beam
    - Rain Dance

    Volbeat (M) @ Damp Rock
    Ability: Prankster
    EVs: 248 HP / 252 Def / 8 SpD
    Bold Nature
    - Tail Glow
    - Baton Pass
    - Encore
    - Rain Dance

    Seismitoad @ Life Orb
    Ability: Swift Swim
    EVs: 252 SpA / 4 SpD / 252 Spe
    Modest Nature
    - Hydro Pump
    - Earth Power
    - Stealth Rock
    - Rain Dance

    Alomomola @ Damp Rock
    Ability: Regenerator
    EVs: 252 HP / 252 Def / 4 SpD
    Bold Nature
    - Wish
    - Protect
    - Toxic
    - Rain Dance

    Armaldo @ Leftovers
    Ability: Swift Swim
    EVs: 128 HP / 252 Atk / 4 Def / 124 Spe
    Adamant Nature
    - X-Scissor
    - Stone Edge
    - Aqua Tail
    - Rapid Spin`; // Sample team data

    useEffect(() => {
        // Function to fetch and set team data
        const fetchTeamData = async () => {
            try {
                let team = new PokemonTeam();
                console.log('PokemonTeam initialized'); // Debugging point

                // Add Pokémon to the team
                console.log('Fetching team data from:', importString);
                //await team.addPokemonFromSpecies("Charizard");
                await team.importTeam(importString); // Import the team data

                console.log('Pokémon added:', team); // Debugging point
                
                // Export the team
                let teamExports = await team.exportTeam();
                console.log('Exported team:', teamExports); // Debugging point

                let exportstring = JSON.stringify(teamExports.teamAdvancedJSON, null, 2); // Format the JSON for better readability
                setTeamData(exportstring); // Set the fetched team data
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
                        <pre className="team-json">{teamData}</pre>
                        {/* You can add a button or trigger to manually set custom data */}
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
