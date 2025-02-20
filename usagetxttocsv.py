import re
import csv
from typing import List, Dict

def parse_usage_stats(file_path: str) -> List[Dict[str, str]]:
    """Parse Pokemon Showdown usage statistics from a text file into structured data"""
    
    pokemon_data = []
    
    with open(file_path, 'r') as file:
        lines = file.readlines()
    
    # Find the start of the table (after the header rows)
    table_start = 0
    for i, line in enumerate(lines):
        if '|' in line and 'Rank' in line:
            table_start = i + 2  # Skip the header and separator lines
            break
    
    # Process each line of the table
    for line in lines[table_start:]:
        # Skip separator lines and empty lines
        if '+----+' in line or line.strip() == '':
            continue
            
        # Split the line by | and clean up each field
        fields = [field.strip() for field in line.split('|')]
        
        # Skip empty or malformed lines
        if len(fields) < 6:
            continue
            
        # Extract data (skip first and last empty fields from split)
        rank = fields[1].strip()
        pokemon = fields[2].strip()
        usage_percent = float(fields[3].strip().rstrip('%'))
        
        # Skip if we don't have valid data
        if not rank or not pokemon or not usage_percent:
            continue
            
        # Convert rank to number and remove leading zeros
        try:
            rank = str(int(rank))
        except ValueError:
            continue
            
        pokemon_data.append({
            'rank': rank,
            'name': pokemon,
            'usage_percent': usage_percent,
            # Set a default viability ceiling based on usage rank
            'viability_ceiling': (
                'Centralizing' if usage_percent >= 25 else
                'Very Popular' if usage_percent >= 15 else
                'Popular' if usage_percent >= 8 else
                'Common' if usage_percent >= 4 else
                'Notable' if usage_percent >= 2 else
                'Uncommon' if usage_percent >= 1 else
                'Rare' if usage_percent >= 0.2 else
                'Very Rare'
            )  
        })
    
    return pokemon_data

def save_to_csv(data: List[Dict[str, str]], output_file: str):
    """Save the parsed data to a CSV file"""
    if not data:
        raise ValueError("No data to save")
        
    # Define the fields we want in our CSV
    fieldnames = ['name', 'usage_percent', 'viability_ceiling']
    
    with open(output_file, 'w', newline='') as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        
        # Write the header
        writer.writeheader()
        
        # Write the data
        for entry in data:
            # Only write the fields we want
            row = {
                'name': entry['name'],
                'usage_percent': entry['usage_percent'],
                'viability_ceiling': entry['viability_ceiling']
            }
            writer.writerow(row)

def main(filename):
    input_file = filename+'.txt'  # Your input text file
    output_file = filename+'.csv'  # The output CSV file
    
    try:
        # Parse the data
        print(f"Parsing usage stats from {input_file}...")
        pokemon_data = parse_usage_stats(input_file)
        
        # Save to CSV
        print(f"Saving data to {output_file}...")
        save_to_csv(pokemon_data, output_file)
        
        print(f"Successfully processed {len(pokemon_data)} Pokemon")
        print(f"Data saved to {output_file}")
        
    except FileNotFoundError:
        print(f"Error: Could not find the input file '{input_file}'")
    except Exception as e:
        print(f"Error: {str(e)}")

if __name__ == "__main__":
    #no extension
    main("gen7ou-1500")