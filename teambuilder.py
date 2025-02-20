import pandas as pd
import numpy as np
from collections import defaultdict

class PokemonAnalyzer:
    def __init__(self, data_path):
        # Load and clean the data
        self.df = pd.read_csv(data_path)
        # Convert type effectiveness columns to numeric if they aren't already
        type_cols = [col for col in self.df.columns if col.startswith('against_')]
        for col in type_cols:
            self.df[col] = pd.to_numeric(self.df[col], errors='coerce')
            
    def calculate_defensive_profile(self, pokemon_name):
        """Calculate defensive strengths and weaknesses"""
        pokemon = self.df[self.df['name'] == pokemon_name].iloc[0]
        resistances = []
        weaknesses = []
        normResistances = []
        normWeaknesses = []
        quadResistances = []
        quadWeaknesses = []
        neutralities = []
        immunities = []
        
        for col in [c for c in self.df.columns if c.startswith('against_')]:
            type_name = col.replace('against_', '')
            multiplier = pokemon[col]
            
            if multiplier == 1:
                neutralities.append(type_name)
            elif multiplier == 0.5:
                resistances.append(type_name)
                normResistances.append(type_name)
            elif multiplier == 0.25:
                resistances.append(type_name)
                quadResistances.append(type_name)
            elif multiplier == 2:
                weaknesses.append(type_name)
                normWeaknesses.append(type_name)
            elif multiplier == 4:
                weaknesses.append(type_name)
                quadWeaknesses.append(type_name)
            # need to implement additional immunities
            elif multiplier == 0:
                immunities.append(type_name)
            else:
                print("invalid typing?")
                
        return {
            'resistances': sorted(resistances, key=lambda x: x[1]),
            'weaknesses': sorted(weaknesses, key=lambda x: x[1], reverse=True)
        }
    
    def calculate_offensive_coverage(self, attacker_name, move_type):
        """Calculate how well a move type covers the meta"""
        attacker = self.df[self.df['name'] == attacker_name].iloc[0]
        
        # Get the effectiveness column for the move type
        effectiveness_col = f'against_{move_type.lower()}'
        
        # Calculate coverage against all Pokemon
        coverage = self.df.apply(
            lambda row: row[effectiveness_col],
            axis=1
        )
        
        return {
            'super_effective': self.df[coverage > 1]['name'].tolist(),
            'neutral': self.df[coverage == 1]['name'].tolist(),
            'not_very_effective': self.df[coverage < 1]['name'].tolist()
        }
    
    def analyze_team_defense(self, team_names: list[str]) -> dict:
        """Analyze team defensive profile and provide strategic insights"""
        team_df = self.df[self.df['name'].isin(team_names)]
        
        # Initialize counters for each type
        type_counters = {
            'immunities': defaultdict(int),
            'resistances': defaultdict(int),  # Combined normal and quad
            'weaknesses': defaultdict(int),   # Combined normal and quad
            'neutral': defaultdict(int)
        }
        
        # Get all possible types
        all_types = [col.replace('against_', '') for col in self.df.columns 
                    if col.startswith('against_')]
        
        # Count resistances and weaknesses for each type
        for _, pokemon in team_df.iterrows():
            for type_name in all_types:
                multiplier = pokemon[f'against_{type_name}']
                
                if multiplier == 0:
                    type_counters['immunities'][type_name] += 1
                elif multiplier < 1:
                    type_counters['resistances'][type_name] += 1
                elif multiplier > 1:
                    type_counters['weaknesses'][type_name] += 1
                else:
                    type_counters['neutral'][type_name] += 1
        
        team_size = len(team_names)
        
        # Analyze defensive patterns
        analysis = {
            'stacked_resistances': [],    # Types with multiple resistances
            'shared_weaknesses': [],      # Types that multiple Pokemon are weak to
            'uncovered_types': [],        # Types with no resistances
            'defensive_observations': [],  # General observations
            'improvement_suggestions': []  # Specific suggestions for improvement
        }
        
        # Find stacked resistances (2+ resistances)
        for type_name in all_types:
            resist_count = (type_counters['resistances'][type_name] + 
                          type_counters['immunities'][type_name])
            weak_count = type_counters['weaknesses'][type_name]
            
            if resist_count >= 2:
                analysis['stacked_resistances'].append(
                    (type_name, resist_count))
            
            if weak_count >= 2:
                analysis['shared_weaknesses'].append(
                    (type_name, weak_count))
            
            if resist_count == 0:
                analysis['uncovered_types'].append(type_name)
        
        # Generate observations
        if analysis['stacked_resistances']:
            analysis['defensive_observations'].append(
                f"Team has strong defensive synergy against "
                f"{', '.join(f'{t[0]} (x{t[1]})' for t in analysis['stacked_resistances'])}")
        
        if analysis['shared_weaknesses']:
            analysis['defensive_observations'].append(
                f"Team shows vulnerability to "
                f"{', '.join(f'{t[0]} (x{t[1]})' for t in analysis['shared_weaknesses'])}")
        
        if analysis['uncovered_types']:
            analysis['defensive_observations'].append(
                f"Team lacks resistances to: {', '.join(analysis['uncovered_types'])}")
        
        # Generate strategic suggestions
        self._generate_strategic_suggestions(analysis, team_df)
        
        return analysis
    
    def _generate_strategic_suggestions(self, analysis: dict, team_df) -> None:
        """Generate specific team improvement suggestions"""
        
        # Suggest counters for shared weaknesses
        for type_name, count in analysis['shared_weaknesses']:
            # Find Pokemon that resist this type
            potential_counters = self.df[
                (self.df[f'against_{type_name}'] < 1) &  # Resists the type
                (self.df['base_total'] >= 450)           # Decent stats
            ]['name'].tolist()[:3]  # Get top 3 suggestions
            
            if potential_counters:
                analysis['improvement_suggestions'].append(
                    f"Consider adding {' or '.join(potential_counters)} to help "
                    f"with the {type_name}-type weakness")
        
        # Suggest coverage for uncovered types
        for type_name in analysis['uncovered_types']:
            # Find Pokemon that resist this type and have good stats
            potential_additions = self.df[
                (self.df[f'against_{type_name}'] < 1) &
                (self.df['base_total'] >= 450)
            ]['name'].tolist()[:3]
            
            if potential_additions:
                analysis['improvement_suggestions'].append(
                    f"To gain {type_name}-type resistance, consider: "
                    f"{', '.join(potential_additions)}")
        
        # Check for defensive role balance
        avg_def = team_df[['defense', 'sp_defense']].mean().mean()
        if avg_def < 75:
            analysis['improvement_suggestions'].append(
                "Team might benefit from a dedicated defensive Pokemon")
        
        # Check for type diversity
        types = pd.concat([team_df['type1'], team_df['type2']]).dropna()
        if len(types.unique()) < 4:
            analysis['improvement_suggestions'].append(
                "Consider adding more type diversity to improve defensive coverage")

def print_defensive_analysis(analyzer, team):
    """Print comprehensive defensive analysis with suggestions"""
    analysis = analyzer.analyze_team_defense(team)
    
    print("\nTeam Defensive Analysis")
    print("=" * 50)
    
    print("\nDefensive Patterns:")
    print("-" * 30)
    if analysis['stacked_resistances']:
        print("\nStacked Resistances:")
        for type_name, count in analysis['stacked_resistances']:
            print(f"- {type_name} (x{count} resistances)")
    
    if analysis['shared_weaknesses']:
        print("\nShared Weaknesses:")
        for type_name, count in analysis['shared_weaknesses']:
            print(f"- {type_name} (x{count} weaknesses)")
    
    if analysis['uncovered_types']:
        print("\nUncovered Types:")
        print(f"- {', '.join(analysis['uncovered_types'])}")
    
    print("\nObservations:")
    print("-" * 30)
    for obs in analysis['defensive_observations']:
        print(f"- {obs}")
    
    print("\nSuggestions for Improvement:")
    print("-" * 30)
    for suggestion in analysis['improvement_suggestions']:
        print(f"- {suggestion}")

# Example usage
if __name__ == "__main__":
    analyzer = PokemonAnalyzer('pokemon.csv')
    team = ['Magearna', 'Alakazam', 'Tapu Lele', 'Landorus', 'Toxapex', "Victini"]
    print_defensive_analysis(analyzer, team)

