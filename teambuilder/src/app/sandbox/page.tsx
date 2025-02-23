import Pokemon from '@/classes/Pokemon.js';
import { PokemonSet, PokemonTeam } from '@/classes/PokemonSet.js';

export default function Sandbox() {
    return (
        <div>
            <h1>Sandbox Page</h1>
            {(() => {
                let team = new PokemonTeam();
                team.addPokemonFromSpecies("Charizard");
                team.addPokemonFromSpecies("Blastoise");
                team.addPokemonFromSpecies("Venusaur");
                //NOTWORKINGIMGOINGTOBED
                return <div>{team.toString()}</div>;
            })()}
        </div>
    );
}
