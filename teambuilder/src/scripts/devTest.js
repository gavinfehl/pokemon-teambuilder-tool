const readline = require('readline');
const { Pokemon } = require('../classes/Pokemon');
const { PokemonSet, PokemonTeam } = require('../classes/PokemonSet');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

let pokemonTeam = new PokemonTeam();

function showMenu() {
    console.log('\nPokémon Team Builder');
    console.log('1. Add Pokémon');
    console.log('2. Remove Pokémon');
    console.log('3. View Team');
    console.log('4. Import Team');
    console.log('5. Export Team');
    console.log('6. See Member Details');
    console.log('7. Get Usage Data');
    console.log('8. Exit');
    rl.question('Choose an option: ', handleMenu);
}

function handleMenu(option) {
    switch (option) {
        case '1':
            rl.question('Enter Pokémon name to add: ', (name) => {
                pokemonTeam.addPokemonFromSpecies(name.trim());
                showMenu(); // Show menu again after adding
            });
            break;
        case '2':
            rl.question('Enter Pokémon name to remove: ', (name) => {
                pokemonTeam.removePokemon(name.trim());
                showMenu();
            });
            break;
        case '3':
            console.log(pokemonTeam.toString());
            showMenu();
            break;
        case '4':
            pokemonTeam.importTeam();
            showMenu();
            break;
        case '5':
            pokemonTeam.exportTeam();
            showMenu();
            break;
        case '6':
            rl.question('Enter Pokémon name to get its fullJSON: ', (inp) => {
            const pokemon = pokemonTeam.getMember(inp.trim());
            if (pokemon) {
                console.log(pokemon.toFullJSON());
            } else {
                console.log('Pokémon not found in the team.');
            }
            showMenu();
            });
            break;
        case '7':
            console.log(pokemonTeam.printUsageData());
            showMenu();
            break;
        case '8':
            console.log('Exiting...');
            rl.close();
            break;
        default:
            console.log('Invalid option. Please try again.');
            showMenu();
    }
}
showMenu();