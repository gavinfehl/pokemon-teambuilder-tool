import re

def parse_pokemon_data(pokemon_text):
    pokemon_data = {}
    lines = pokemon_text.strip().split("\n")
    
    # Extract Pokémon's name and gender (if provided)
    name_gender = re.match(r"(.+) \((.+)\)", lines[0])
    if name_gender:
        pokemon_data["Name"] = name_gender.group(1).strip()
        pokemon_data["Gender"] = name_gender.group(2).strip()
    else:
        pokemon_data["Name"] = lines[0].strip()
        pokemon_data["Gender"] = None
    
    # Extract item and ability
    for line in lines[1:]:
        if line.startswith("Ability:"):
            pokemon_data["Ability"] = line.split(":")[1].strip()
        elif line.startswith("Shiny:"):
            pokemon_data["Shiny"] = line.split(":")[1].strip()
        elif line.startswith("Tera Type:"):
            pokemon_data["Tera Type"] = line.split(":")[1].strip()
        elif line.startswith("EVs:"):
            evs = line.split(":")[1].strip().split("/")
            ev_dict = {ev.split()[1]: int(ev.split()[0]) for ev in evs}
            pokemon_data["EVs"] = ev_dict
        elif line.startswith("-"):
            if "Moves" not in pokemon_data:
                pokemon_data["Moves"] = []
            pokemon_data["Moves"].append(line.replace("-", "").strip())
        elif "Nature" in line:
            pokemon_data["Nature"] = line.strip()
        elif "@" in line:
            pokemon_data["Item"] = line