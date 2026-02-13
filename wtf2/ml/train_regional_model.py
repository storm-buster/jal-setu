import pandas as pd
import numpy as np
from flood_risk_model import FloodRiskModel
import logging
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def main():
    """Train the flood risk model with regional data (Bihar & Jharkhand)."""
    
    print("=" * 70)
    print("TRAINING Jal-Setu AI MODEL WITH REGIONAL DATA")
    print("=" * 70)
    
    # Load regional training data
    logger.info("Loading regional training data...")
    df = pd.read_csv('../data/regional_training_data.csv')
    
    print(f"\n📊 Dataset Information:")
    print(f"   Total Samples: {len(df)}")
    print(f"   Regions: {df['region'].unique().tolist()}")
    print(f"   Districts: {len(df['district'].unique())}")
    print(f"   Features: {len(df.columns) - 2} (excluding region and district)")
    
    print(f"\n📍 Regional Distribution:")
    for region in df['region'].unique():
        count = len(df[df['region'] == region])
        pct = (count / len(df)) * 100
        districts = df[df['region'] == region]['district'].unique()
        print(f"   {region}: {count} samples ({pct:.1f}%)")
        print(f"      Districts: {', '.join(districts)}")
    
    print(f"\n🎯 Risk Class Distribution:")
    for risk_class in [0, 1, 2]:
        count = len(df[df['risk_class'] == risk_class])
        pct = (count / len(df)) * 100
        label = ['Low', 'Medium', 'High'][risk_class]
        print(f"   {label} Risk (Class {risk_class}): {count} samples ({pct:.1f}%)")
    
    # Split features and target
    X = df.drop(['risk_class', 'region', 'district'], axis=1)
    y = df['risk_class']
    
    print(f"\n🔧 Feature Statistics:")
    print(f"   Elevation: {X['elevation'].mean():.1f}m (range: {X['elevation'].min():.1f}-{X['elevation'].max():.1f})")
    print(f"   Slope: {X['slope'].mean():.1f}° (range: {X['slope'].min():.1f}-{X['slope'].max():.1f})")
    print(f"   Flood Depth: {X['flood_depth'].mean():.1f}m (range: {X['flood_depth'].min():.1f}-{X['flood_depth'].max():.1f})")
    print(f"   Population Density: {X['population_density'].mean():.0f}/sq km")
    print(f"   Velocity Index: {X['velocity_index'].mean():.2f}")
    
    print(f"\n🤖 Initializing Random Forest Model...")
    print(f"   Algorithm: Random Forest Classifier")
    print(f"   Estimators: 100 trees")
    print(f"   Max Depth: 15")
    print(f"   Min Samples Split: 5")
    print(f"   Class Weight: Balanced")
    
    # Initialize and train model
    model = FloodRiskModel(model_type='random_forest', n_estimators=100)
    
    print(f"\n🎓 Training Model...")
    accuracy = model.train(X, y)
    
    print(f"\n✅ Training Completed!")
    print(f"   Accuracy: {accuracy:.1%}")
    
    # Save model
    model_path = '../models/flood_risk_model.pkl'
    model.save_model(model_path)
    print(f"   Model saved to: {model_path}")
    
    # Feature importance
    if hasattr(model.model, 'feature_importances_'):
        print(f"\n📈 Feature Importance (Top 5):")
        importance_df = pd.DataFrame({
            'feature': model.feature_names,
            'importance': model.model.feature_importances_
        }).sort_values('importance', ascending=False)
        
        for i, row in importance_df.head(5).iterrows():
            print(f"   {i+1}. {row['feature']}: {row['importance']:.1%}")
    
    # Test prediction with sample data
    print(f"\n🧪 Testing Predictions with Regional Samples:")
    
    test_samples = [
        {
            'district': 'Bhagalpur (High Risk Plain Area)',
            'elevation': 45.2,
            'slope': 1.8,
            'flow_accumulation': 8901.23,
            'distance_to_river': 23.45,
            'flood_depth': 4.5,
            'lulc_agriculture': 0.87,
            'lulc_urban': 0.04,
            'population_density': 123,
            'velocity_index': 0.94
        },
        {
            'district': 'Ranchi (Low Risk Plateau Area)',
            'elevation': 356.7,
            'slope': 25.3,
            'flow_accumulation': 456.78,
            'distance_to_river': 678.90,
            'flood_depth': 0.3,
            'lulc_agriculture': 0.23,
            'lulc_urban': 0.45,
            'population_density': 2345,
            'velocity_index': 0.23
        },
        {
            'district': 'Muzaffarpur (Medium Risk Area)',
            'elevation': 112.3,
            'slope': 7.8,
            'flow_accumulation': 3456.78,
            'distance_to_river': 156.78,
            'flood_depth': 2.1,
            'lulc_agriculture': 0.62,
            'lulc_urban': 0.19,
            'population_density': 678,
            'velocity_index': 0.71
        }
    ]
    
    for sample in test_samples:
        district = sample.pop('district')
        prediction = model.predict(sample)
        print(f"\n   {district}:")
        print(f"      Predicted Risk: {prediction['risk_label']} (Confidence: {prediction['confidence']:.1%})")
        print(f"      Probabilities: Low={prediction['probabilities']['low']:.1%}, "
              f"Medium={prediction['probabilities']['medium']:.1%}, "
              f"High={prediction['probabilities']['high']:.1%}")
    
    print("\n" + "=" * 70)
    print("MODEL TRAINING SUMMARY")
    print("=" * 70)
    print(f"✅ Model trained on {len(df)} samples from Bihar and Jharkhand")
    print(f"✅ Accuracy: {accuracy:.1%}")
    print(f"✅ Model saved and ready for predictions")
    print(f"✅ GenAI chatbot can use this model for risk assessment")
    print("=" * 70)
    
    return model, accuracy

if __name__ == "__main__":
    model, accuracy = main()