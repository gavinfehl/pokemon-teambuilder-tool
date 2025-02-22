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
section_names = ["Basic Info", "Abilities", "Items", "Spreads", "Moves", "Tera Types", "Teammates", "Checks and Counters"]

# Prepare CSV data
csv_data = [["Basic Info", "Raw count", "Avg. weight", "Viability Ceiling", "Abilities", "Items", "Spreads", "Moves", "Tera Types", "Teammates", "Checks and Counters"]]
pokemonList = split_pokemonList(data)

# Iterate over list to parse relevant data
# Each section is one mon and starts with
for pokemon in pokemonList:
    csv_row = []
    csv_item = ""
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
            if csv_item != "":
                csv_row.append(csv_item)
            csv_item = ""
            current_section = line
            continue
        # Set mon name
        if current_section == "Basic Info" and ":" not in line and "NEXT" not in line:
            pokemon_species = line
            csv_row.append(pokemon_species)
            continue
        # Handle stat lines with colons
        if ":" in line and current_section != "Spreads":
            if line.startswith("Raw count"):
                key, value = line.split(": ")
                csv_row.append(value)
            elif line.startswith("Avg. weight"):
                key, value = line.split(": ")
                csv_row.append(value)
            elif line.startswith("Viability Ceiling"):
                key, value = line.split(": ")
                csv_row.append(value)
            continue

        elif current_section == "Checks and Counters":
            if '(' in line and not line.startswith('('):
                pokemon = line.split('(')[0].strip().split()[0]
                main_value = re.search(r'([\d.]+)\s+\(', line).group(1)
                percentage = re.search(r'\(([\d.]+)±', line).group(1)
                if csv_item == "":
                    csv_item += (pokemon +"/ "+ main_value +"/ "+percentage)
                else:
                    csv_item += (" | "+ pokemon +"/ "+ main_value +"/ "+percentage)
                
            elif line.startswith('(') and 'KOed' in line:
                KOed = re.findall(r'\d+\.\d%', line)[0]
                SwitchedOut = re.findall(r'\d+\.\d%', line)[1]
                csv_item += (" / KO'd: "+ KOed)
                csv_item += (" / Switched Out: "+ SwitchedOut)
            continue
                
        # Handle all other percentage-based sections
        elif '%' in line:
            item, value = line.rsplit(' ', 1)
            value = value.rstrip('%')
            if csv_item == "":
                csv_item += (item.strip()+": "+value)
            else:
                csv_item += (" | "+item.strip()+": "+value)
    csv_row.append(csv_item)
    csv_data.append(csv_row)
            

            
        

# Write to CSV
with open('movesetusage.csv', mode='w', newline='') as file:
    writer = csv.writer(file)
    writer.writerows(csv_data)

print("Data exported to movesetusage.csv")
