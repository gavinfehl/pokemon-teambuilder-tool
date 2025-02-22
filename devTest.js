const readline = require('readline');
const { Pokemon } = require('./Pokemon');
const { PokemonSet } = require('./PokemonSet');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

let pokemonTeam = new PokemonSet();

function showMenu() {
    console.log('\nPokémon Team Builder');
    console.log('1. Add Pokémon');
    console.log('2. Remove Pokémon');
    console.log('3. View Team');
    console.log('4. Import Team');
    console.log('5. Export Team');
    console.log('6. Exit');
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
            rl.close();
            break;
        default:
            console.log('Invalid option. Please try again.');
            showMenu();
    }
}

showMenu();