import pandas as pd
import numpy as np
from flood_risk_model import FloodRiskModel
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def generate_sample_data(n_samples=1000):
    """
    Generate synthetic training data based on physics-based flood characteristics.
    This simulates real-world data that would come from ArcGIS hydrology analysis.
    """
    np.random.seed(42)
    
    # Generate terrain features
    elevation = np.random.uniform(50, 500, n_samples)  # meters
    slope = np.random.uniform(0, 30, n_samples)  # degrees
    flow_accumulation = np.random.exponential(scale=1000, size=n_samples)  # flow concentration
    distance_to_river = np.random.exponential(scale=500, size=n_samples)  # meters
    
    # Generate flood scenarios
    flood_depth = np.random.uniform(0, 5, n_samples)  # meters
    velocity_index = np.random.uniform(0, 1, n_samples)  # normalized
    
    # Land use (normalized percentages)
    lulc_agriculture = np.random.uniform(0, 1, n_samples)
    lulc_urban = np.random.uniform(0, 1, n_samples)
    
    # Population density (people per sq km)
    population_density = np.random.exponential(scale=500, size=n_samples)
    
    # Create DataFrame
    df = pd.DataFrame({
        'elevation': elevation,
        'slope': slope,
        'flow_accumulation': flow_accumulation,
        'distance_to_river': distance_to_river,
        'flood_depth': flood_depth,
        'lulc_agriculture': lulc_agriculture,
        'lulc_urban': lulc_urban,
        'population_density': population_density,
        'velocity_index': velocity_index
    })
    
    # Generate risk labels based on physics-based rules
    # These rules simulate the ArcGIS physics output that ML will refine
    risk_scores = []
    
    for i in range(n_samples):
        score = 0
        
        # Depth is the primary factor (physics-based)
        if df.loc[i, 'flood_depth'] > 2:
            score += 2
        elif df.loc[i, 'flood_depth'] > 1:
            score += 1
        
        # Velocity increases destructive potential
        if df.loc[i, 'velocity_index'] > 0.7:
            score += 2
        elif df.loc[i, 'velocity_index'] > 0.4:
            score += 1
        
        # Proximity to river
        if df.loc[i, 'distance_to_river'] < 100:
            score += 2
        elif df.loc[i, 'distance_to_river'] < 300:
            score += 1
        
        # Slope factor (steeper = more dangerous flash floods)
        if df.loc[i, 'slope'] > 20:
            score += 1
        
        # Population exposure
        if df.loc[i, 'population_density'] > 1000:
            score += 1
        
        # Low elevation areas are more vulnerable
        if df.loc[i, 'elevation'] < 100:
            score += 1
        
        # Determine risk class
        if score >= 5:
            risk_scores.append(2)  # High
        elif score >= 3:
            risk_scores.append(1)  # Medium
        else:
            risk_scores.append(0)  # Low
    
    df['risk_class'] = risk_scores
    
    return df

def main():
    """Main training function."""
    logger.info("Generating sample training data...")
    df = generate_sample_data(n_samples=1000)
    
    logger.info(f"Generated {len(df)} samples")
    logger.info(f"Risk distribution:\n{df['risk_class'].value_counts()}")
    
    # Split features and target
    X = df.drop('risk_class', axis=1)
    y = df['risk_class']
    
    # Initialize and train model
    model = FloodRiskModel(model_type='random_forest', n_estimators=100)
    accuracy = model.train(X, y)
    
    # Save model
    model.save_model('../models/flood_risk_model.pkl')
    
    # Test prediction
    logger.info("\nTesting prediction with sample data...")
    test_sample = X.iloc[0].to_dict()
    prediction = model.predict(test_sample)
    logger.info(f"Sample prediction: {prediction}")
    
    return model

if __name__ == "__main__":
    main()