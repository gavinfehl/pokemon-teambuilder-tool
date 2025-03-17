'use client';
import React, { useEffect, useState } from 'react';
import {PokemonSet, PokemonTeam, PokemonTier} from '@/classes/PokemonSet'
import TestGraph from '@/components/ui/testgraph'; // Adjust the import path as necessary
import "../css/sandbox.scss";

// Define team globally

export default function Sandbox() {
    const [loading, setLoading] = useState(true); // Loading state for when the team is being fetched
    const [team, setTeam] = useState(new PokemonTier());
    const [tier, setTier] = useState(new PokemonTier());
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
    const debuggen7ouviabilityrankingmons = [
        "Magearna", "Landorus-Therian", "Toxapex", "Kartana", "Charizard-Mega-X", "Heatran",
        "Gliscor", "Latias-Mega", "Kyurem-Black", "Chansey", "Tapu Koko", "Tornadus-Therian", 
        "Serperior", "Greninja", "Ferrothorn", "Volcarona", "Cresselia", "Tapu Lele", 
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
    const debuggen8ouviabilityrankingmons = [
        "Dragapult",
        "Weavile",
        "Heatran",
        "Landorus-Therian",
        "Melmetal",
        "Tornadus-Therian",
        "Clefable",
        "Zapdos",
        "Urshifu-Rapid-Strike",
        "Tapu Lele",
        "Garchomp",
        "Ferrothorn",
        "Slowking-Galar",
        "Kartana",
        "Slowbro",
        "Rillaboom",
        "Tapu Koko",
        "Toxapex",
        "Corviknight",
        "Tyranitar",
        "Dragonite",
        "Rotom-Wash",
        "Tapu Fini",
        "Blaziken",
        "Excadrill",
        "Blacephalon",
        "Volcanion",
        "Buzzwole",
        "Volcarona",
        "Gastrodon",
        "Slowking",
        "Hippowdon",
        "Magnezone",
        "Zeraora",
        "Arctozolt",
        "Ninetales-Alola",
        "Victini",
        "Pelipper",
        "Blissey",
        "Moltres-Galar",
        "Skarmory",
        "Mew",
        "Barraskewda",
        "Aegislash",
        "Scizor",
        "Nihilego",
        "Nidoking",
        "Hawlucha",
        "Hydreigon",
        "Zapdos-Galar",
        "Reuniclus",
        "Crawdaunt",
        "Celesteela",
        "Tapu Bulu",
        "Suicune",
        "Mandibuzz",
        "Bisharp",
        "Tangrowth",
        "Seismitoad",
        "Cloyster",
        "Amoonguss",
        "Jirachi",
        "Kingdra",
        "Kommo-o",
        "Keldeo",
        "Thundurus-Therian",
        "Dracozolt",
        "Necrozma",
        "Mamoswine",
        "Venusaur",
        "Torkoal",
        "Swampert",
        "Moltres",
        "Cresselia",
        "Polteageist",
        "Regieleki",
        "Gengar",
        "Quagsire",
        "Azumarill",
        "Hatterene",
        "Primarina",
        "Latios",
        "Ditto",
        "Rotom-Heat",
        "Terrakion",
        "Latias",
        "Toxtricity",
        "Shedinja",
        "Marowak-Alola",
        "Porygon2",
        "Conkeldurr",
        "Zarude",
        "Alakazam",
        "Togekiss",
        "Avalugg",
        "Shiftry",
        "Haxorus",
        "Shuckle",
        "Darmanitan",
        "Cobalion",
        "Blastoise",
        "Omastar",
      ];
      

    useEffect(() => {
        // Function to fetch and set team data
        const initializePokemonSet = async () => {
            try {
                const teamInstance = new PokemonTier("graphtestteam", 5, "gen7ou");
                await teamInstance.initializeTier();
                setTeam(teamInstance);
                console.log(teamInstance.generation, teamInstance.format); // Debugging point
                console.log('PokemonTeam initialized');
            } catch (error) {
                console.error('Error initializing Pokemon data:', error);
            } finally {
                setLoading(false);
            }
        };

        initializePokemonSet(); // Run the fetch function when component mounts
    }, []);

    return (
        <div className="sandbox-container">
            <h1 className="sandbox-title">GRAPHTESTPAGE</h1>
            <TestGraph team={team}/>
            <h1>YUPPP CREATED BY BOKAYTREBUCHET BITTTTCH</h1>
        </div>
    );
}
