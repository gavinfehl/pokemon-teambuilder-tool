'use client';
import React, { useEffect, useState } from 'react';
import {PokemonSet, PokemonTeam, PokemonTier} from '@/classes/PokemonSet'
// Replace the TestGraph import with ImprovedTestGraph
import ImprovedTestGraph from '@/components/ui/ImprovedTestGraph';
import "../css/sandbox.scss";

export default function Sandbox() {
    const [loading, setLoading] = useState(true);
    const [team, setTeam] = useState(new PokemonTier());
    const [tier, setTier] = useState(new PokemonTier());
    
    // Your existing code for initializing data...

    useEffect(() => {
        // Function to fetch and set team data
        const initializePokemonSet = async () => {
            try {
                const teamInstance = new PokemonTier("graphtestteam", 5, "gen7ou");
                await teamInstance.initializeTier();
                setTeam(teamInstance);
                console.log(teamInstance.generation, teamInstance.format);
                console.log('PokemonTeam initialized');
            } catch (error) {
                console.error('Error initializing Pokemon data:', error);
            } finally {
                setLoading(false);
            }
        };

        initializePokemonSet();
    }, []);

    return (
        <div className="sandbox-container">
            <h1 className="sandbox-title">GRAPHTESTPAGE</h1>
            {/* Replace TestGraph with ImprovedTestGraph */}
            <ImprovedTestGraph team={team}/>
            <h1>YUPPP CREATED BY BOKAYTREBUCHET BITTTTCH</h1>
        </div>
    );
}