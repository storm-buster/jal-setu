import pandas as pd
import numpy as np
from typing import List, Dict

def generate_regional_data(n_samples: int = 1000) -> pd.DataFrame:
    """
    Generate realistic training data for Bihar and Jharkhand regions.
    
    Regions covered:
    - Bihar: Bhagalpur, Muzaffarpur, Begusarai, Patna, Gaya
    - Jharkhand: Ranchi, Hazaribagh, Dhanbad, Jamshedpur
    
    This generates data based on real geographic characteristics:
    - Bihar: Plains, riverine flood prone, lower elevation
    - Jharkhand: Plateau, flash flood prone, higher elevation
    """
    
    np.random.seed(42)
    
    regions = {
        'Bihar': {
            'districts': ['Bhagalpur', 'Muzaffarpur', 'Begusarai', 'Patna', 'Gaya'],
            'elevation_range': (30, 200),
            'slope_range': (0.5, 15),
            'flood_prone': True
        },
        'Jharkhand': {
            'districts': ['Ranchi', 'Hazaribagh', 'Dhanbad', 'Jamshedpur'],
            'elevation_range': (150, 400),
            'slope_range': (10, 35),
            'flood_prone': False
        }
    }
    
    data = []
    
    for _ in range(n_samples):
        # Randomly select region and district
        region = np.random.choice(['Bihar', 'Jharkhand'])
        district = np.random.choice(regions[region]['districts'])
        
        # Generate terrain features based on region
        if region == 'Bihar':
            # Bihar: Lower elevation, gentler slopes, riverine floods
            elevation = np.random.uniform(30, 200)
            slope = np.random.uniform(0.5, 15)
            distance_to_river = np.random.exponential(scale=200)
            flood_depth = np.random.uniform(0.5, 5.0)
            
            # Higher flow accumulation in plains
            flow_accumulation = np.random.exponential(scale=5000)
            
            # Higher velocity for riverine areas near river
            velocity_index = np.random.uniform(0.6, 1.0)
            
            # More agriculture, less urban
            lulc_agriculture = np.random.uniform(0.7, 0.9)
            lulc_urban = np.random.uniform(0.03, 0.15)
            
            # Moderate population density
            population_density = np.random.exponential(scale=500)
            
        else:  # Jharkhand
            # Jharkhand: Higher elevation, steeper slopes, flash floods
            elevation = np.random.uniform(150, 400)
            slope = np.random.uniform(10, 35)
            distance_to_river = np.random.exponential(scale=400)
            flood_depth = np.random.uniform(0.2, 3.0)
            
            # Lower flow accumulation on plateau
            flow_accumulation = np.random.exponential(scale=2000)
            
            # High velocity for flash floods
            velocity_index = np.random.uniform(0.3, 0.9)
            
            # Less agriculture, more mixed land use
            lulc_agriculture = np.random.uniform(0.3, 0.6)
            lulc_urban = np.random.uniform(0.15, 0.35)
            
            # Higher population in urban areas
            population_density = np.random.exponential(scale=800)
        
        # Calculate risk class based on physics-based rules
        risk_score = 0
        
        # Depth factor (primary)
        if flood_depth > 3.0:
            risk_score += 3
        elif flood_depth > 1.5:
            risk_score += 2
        elif flood_depth > 0.8:
            risk_score += 1
        
        # Velocity factor (more important for Jharkhand flash floods)
        if velocity_index > 0.8:
            risk_score += 2
        elif velocity_index > 0.5:
            risk_score += 1
        
        # Proximity to river
        if distance_to_river < 100:
            risk_score += 2
        elif distance_to_river < 250:
            risk_score += 1
        
        # Slope factor (critical for Jharkhand)
        if slope > 20:
            risk_score += 1
        
        # Elevation factor
        if elevation < 80:
            risk_score += 1
        
        # Population exposure
        if population_density > 800:
            risk_score += 1
        
        # Flow accumulation
        if flow_accumulation > 6000:
            risk_score += 1
        
        # Determine risk class
        if risk_score >= 6:
            risk_class = 2  # High
        elif risk_score >= 3:
            risk_class = 1  # Medium
        else:
            risk_class = 0  # Low
        
        data.append({
            'elevation': round(elevation, 1),
            'slope': round(slope, 1),
            'flow_accumulation': round(flow_accumulation, 2),
            'distance_to_river': round(distance_to_river, 2),
            'flood_depth': round(flood_depth, 1),
            'lulc_agriculture': round(lulc_agriculture, 2),
            'lulc_urban': round(lulc_urban, 2),
            'population_density': int(population_density),
            'velocity_index': round(velocity_index, 2),
            'risk_class': risk_class,
            'region': region,
            'district': district
        })
    
    return pd.DataFrame(data)

def main():
    """Generate and save regional training data."""
    print("Generating regional training data...")
    
    # Generate 1000 samples
    df = generate_regional_data(n_samples=1000)
    
    # Save to CSV
    df.to_csv('../data/regional_training_data.csv', index=False)
    
    print(f"Generated {len(df)} samples")
    print(f"\nRegion distribution:")
    print(df['region'].value_counts())
    print(f"\nDistrict distribution:")
    print(df['district'].value_counts())
    print(f"\nRisk class distribution:")
    print(df['risk_class'].value_counts())
    
    # Statistics by region
    print(f"\n\nStatistics by Region:")
    print("=" * 60)
    for region in df['region'].unique():
        region_data = df[df['region'] == region]
        print(f"\n{region}:")
        print(f"  Samples: {len(region_data)}")
        print(f"  Avg Elevation: {region_data['elevation'].mean():.1f}m")
        print(f"  Avg Slope: {region_data['slope'].mean():.1f}°")
        print(f"  Avg Flood Depth: {region_data['flood_depth'].mean():.1f}m")
        print(f"  High Risk %: {(region_data['risk_class'] == 2).sum() / len(region_data) * 100:.1f}%")
        print(f"  Districts: {', '.join(region_data['district'].unique())}")
    
    print("\n" + "=" * 60)
    print("Data saved to: data/regional_training_data.csv")

if __name__ == "__main__":
    main()