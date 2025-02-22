import os
import re
import csv

# Change working directory to the script's directory
os.chdir(os.path.dirname(os.path.abspath(__file__)))

# Read the data from the file
with open('movesetusage.txt', 'r') as file:
    data = file.read()

# Function to split the data into sections
def split_pokemonList(data):
    pokemonList = data.split(' +----------------------------------------+ \n +----------------------------------------+ ')
    return pokemonList

# List of section names to include
section_names = ["Basic Info", "Abilities", "Items", "Spreads", "Moves", "Teammates", "Tera Types", "Checks and Counters"]

# Prepare CSV data
csv_data = [["Section", "Item", "Value", "Percent"]]
pokemonList = split_pokemonList(data)

# Iterate over list to parse relevant data
# Each section is one mon and starts with
for pokemon in pokemonList:
    current_section = "Basic Info"
    lines = pokemon.split('\n')
    for line in lines:
        # SET UP LINE
        line = line.replace("+----------------------------------------+", "NEXT SECTION")
        line = line.replace(" | ", "")
        line = line.replace(" |", "")
        line = ' '.join(line.split())

        # SKIP SECTION STARTS AND BLANK LINES
        if ((line == "" )|(line == "NEXT SECTION")):
            continue
        
        # Handle section headers
        if line in section_names:
            current_section = line
            continue
        # Set mon name
        if current_section == "Basic Info" and ":" not in line and "NEXT" not in line:
            pokemon_species = line
            csv_data.append(["Basic Info", "Species", pokemon_species, "-"])
            continue
        # Handle stat lines with colons
        if ":" in line:
            if line.startswith("Raw count"):
                key, value = line.split(": ")
                csv_data.append(["Basic Info", key, float(value), "-"])
            elif line.startswith("Avg. weight"):
                key, value = line.split(": ")
                csv_data.append(["Basic Info", key, float(value), "-"])
            elif line.startswith("Viability Ceiling"):
                key, value = line.split(": ")
                csv_data.append(["Basic Info", key, int(value), "-"])
            continue

        elif current_section == "Checks and Counters":
            if '(' in line and not line.startswith('('):
                pokemon = line.split('(')[0].strip()
                main_value = re.search(r'([\d.]+)\s+\(', line).group(1)
                percentage = re.search(r'\(([\d.]+)±', line).group(1)
                csv_data.append([current_section, pokemon, float(main_value), float(percentage)])
            elif line.startswith('(') and 'KOed' in line:
                # Process KOed/switched stats if needed
                continue
                
        # Handle all other percentage-based sections
        elif '%' in line:
            item, value = line.rsplit(' ', 1)
            value = value.rstrip('%')
            csv_data.append([current_section, "-", item.strip(), float(value)])
            
        # Handle nature/EV spreads
        elif current_section == "Spreads" and ":" in line and "%" in line:
            spread, percentage = line.rsplit(' ', 1)
            percentage = percentage.rstrip('%')
            csv_data.append([current_section, spread.strip(), float(percentage), "-"])
            

            
        

# Write to CSV
with open('movesetusage.csv', mode='w', newline='') as file:
    writer = csv.writer(file)
    writer.writerows(csv_data)

print("Data exported to movesetusage.csv")
