import pandas as pd
from collections import defaultdict
from typing import List, Dict, Tuple

class PokemonAnalyzer:
    def __init__(self, pokemon_data_path, usage_data_path):
        # Load base Pokemon data
        self.df = pd.read_csv(pokemon_data_path)
        type_cols = [col for col in self.df.columns if col.startswith('against_')]
        for col in type_cols:
            self.df[col] = pd.to_numeric(self.df[col], errors='coerce')
            
        # Load and process usage data
        self.usage_data = self._load_usage_data(usage_data_path)
        
        # Merge usage data with Pokemon data
        self.df = self.df.merge(
            self.usage_data[['name', 'usage_percent', 'viability_ceiling']],
            on='name',
            how='left'
        )
        
        # Fill NaN usage stats with 0 for Pokemon not in the meta
        self.df['usage_percent'] = self.df['usage_percent'].fillna(0)
        self.df['viability_ceiling'] = self.df['viability_ceiling'].fillna(0)

    def _load_usage_data(self, path):
        """Load and process usage statistics"""
        usage_df = pd.read_csv(path)
        
        # Example of expected usage data format:
        # name,usage_percent,viability_ceiling
        # Landorus-Therian,45.2,4
        # Heatran,20.1,4
        # etc...
        
        return usage_df

    def find_replacement_candidates(self, team_names: List[str], 
                                  problem_types: List[str], 
                                  current_member: str,
                                  min_usage: float = 1.0,  # Minimum usage percentage
                                  min_viability: int = 3   # Minimum viability score (1-4)
                                  ) -> List[Tuple[str, float, str]]:
        """Find viable Pokemon that could replace a team member"""
        current_mon = self.df[self.df['name'] == current_member].iloc[0]
        
        # Filter for competitively viable Pokemon
        viable_mons = self.df[
            (self.df['usage_percent'] >= min_usage) &
            (self.df['viability_ceiling'] >= min_viability) &
            (~self.df['name'].isin(team_names))
        ]
        
        candidates = []
        for _, pokemon in viable_mons.iterrows():
            improvement_score = 0
            reasoning = []
            
            # Consider usage stats in scoring
            usage_bonus = (pokemon['usage_percent'] / 100) * 2  # Usage bonus up to 2 points
            viability_bonus = pokemon['viability_ceiling'] / 2   # Viability bonus up to 2 points
            improvement_score += usage_bonus + viability_bonus
            
            if pokemon['usage_percent'] > current_mon.get('usage_percent', 0):
                reasoning.append(f"Higher usage ({pokemon['usage_percent']:.1f}%)")
            
            # Check defensive improvements
            for type_name in problem_types:
                current_multiplier = current_mon[f'against_{type_name}']
                candidate_multiplier = pokemon[f'against_{type_name}']
                
                if candidate_multiplier < current_multiplier:
                    improvement = current_multiplier - candidate_multiplier
                    improvement_score += improvement * 2
                    reasoning.append(f"Better {type_name} resistance")
            
            # Consider stats with competitive context
            key_stats = {
                'speed': "Speed control",
                'hp': "Bulk",
                'defense': "Physical bulk",
                'sp_defense': "Special bulk"
            }
            
            for stat, description in key_stats.items():
                if pokemon[stat] > current_mon[stat] + 20:
                    improvement_score += 0.5
                    reasoning.append(f"Better {description}")
            
            # Only suggest Pokemon with meaningful improvements and good competitive standing
            if improvement_score > 2:  # Higher threshold for suggestions
                candidates.append((
                    pokemon['name'],
                    improvement_score,
                    f"Usage: {pokemon['usage_percent']:.1f}% | " + " & ".join(reasoning[:2])
                ))
        
        return sorted(candidates, key=lambda x: x[1], reverse=True)[:3]

    def print_meta_info(self):
        """Print current meta information"""
        print("\nTop 10 Pokemon by Usage:")
        print("-" * 40)
        top_10 = self.df.nlargest(10, 'usage_percent')
        for _, mon in top_10.iterrows():
            print(f"{mon['name']}: {mon['usage_percent']:.1f}% (Viability: {mon['viability_ceiling']})")

# Example usage
if __name__ == "__main__":
    # Example of how usage data CSV should look:
    """
    name,usage_percent,viability_ceiling
    Landorus-Therian,45.2,4
    Heatran,20.1,4
    Ferrothorn,18.5,4
    Toxapex,16.8,4
    Greninja,15.9,4
    Tapu Koko,15.5,4
    Medicham-Mega,15.2,4
    Zapdos,14.8,4
    Kartana,14.5,4
    Tapu Lele,14.2,4
    """
    
    analyzer = PokemonAnalyzer(
        'pokemon_data.csv',
        'gen7_ou_usage.csv'  # You'll need to create this file with usage stats
    )
    
    # Print meta information
    analyzer.print_meta_info()
    
    # Analyze team
    team = ['Venusaur', 'Charizard', 'Blastoise']
    print_defensive_analysis(analyzer, team)