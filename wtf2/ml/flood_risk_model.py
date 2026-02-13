import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import classification_report, confusion_matrix
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class FloodRiskModel:
    """
    Physics-first ML model for flood risk classification.
    Refines ArcGIS physics-based risk zones using terrain-adaptive learning.
    """
    
    def __init__(self, model_type='random_forest', n_estimators=100, random_state=42):
        self.model_type = model_type
        self.n_estimators = n_estimators
        self.random_state = random_state
        self.model = None
        self.scaler = StandardScaler()
        self.feature_names = []
        self.is_trained = False
        
        # Initialize model based on type
        if model_type == 'random_forest':
            self.model = RandomForestClassifier(
                n_estimators=n_estimators,
                random_state=random_state,
                max_depth=15,
                min_samples_split=5,
                min_samples_leaf=2,
                class_weight='balanced'
            )
        elif model_type == 'gradient_boosting':
            self.model = GradientBoostingClassifier(
                n_estimators=n_estimators,
                random_state=random_state,
                learning_rate=0.1,
                max_depth=5
            )
        elif model_type == 'logistic_regression':
            self.model = LogisticRegression(
                random_state=random_state,
                max_iter=1000,
                class_weight='balanced'
            )
        else:
            raise ValueError(f"Unknown model type: {model_type}")
    
    def prepare_features(self, df):
        """
        Prepare and engineer features for flood risk prediction.
        
        Expected features:
        - elevation: Terrain elevation (meters)
        - slope: Terrain slope (degrees)
        - flow_accumulation: Water flow concentration
        - distance_to_river: Distance from river (meters)
        - flood_depth: Water depth from bathtub model (meters)
        - lulc_agriculture: Percentage of agricultural land
        - lulc_urban: Percentage of urban land
        - population_density: People per square km
        - velocity_index: Flood velocity indicator
        """
        # Feature engineering
        df = df.copy()
        
        # Log transform for skewed features
        df['flow_accumulation_log'] = np.log1p(df['flow_accumulation'])
        df['distance_to_river_log'] = np.log1p(df['distance_to_river'])
        
        # Interaction features
        df['depth_elevation_ratio'] = df['flood_depth'] / (df['elevation'] + 1)
        df['slope_velocity_interaction'] = df['slope'] * df['velocity_index']

        # Guard against single-row predictions where flood_depth can be 0 (max would be 0).
        flood_depth_max = float(df['flood_depth'].max())
        if flood_depth_max <= 0:
            flood_depth_max = 1.0
        df['population_exposure'] = df['population_density'] * (df['flood_depth'] / flood_depth_max)
        
        # Define feature columns
        feature_cols = [
            'elevation', 'slope', 'flow_accumulation_log', 'distance_to_river_log',
            'flood_depth', 'lulc_agriculture', 'lulc_urban', 'population_density',
            'velocity_index', 'depth_elevation_ratio', 'slope_velocity_interaction',
            'population_exposure'
        ]
        
        self.feature_names = feature_cols
        return df[feature_cols]
    
    def train(self, X, y):
        """
        Train the flood risk model.
        
        Args:
            X: Feature DataFrame
            y: Risk labels (0=Low, 1=Medium, 2=High)
        """
        logger.info(f"Training {self.model_type} model...")
        
        # Prepare features
        if isinstance(X, pd.DataFrame):
            X = self.prepare_features(X)
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=self.random_state, stratify=y
        )
        
        # Scale features
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)
        
        # Train model
        self.model.fit(X_train_scaled, y_train)
        self.is_trained = True
        
        # Evaluate
        y_pred = self.model.predict(X_test_scaled)
        logger.info(f"Training completed. Accuracy: {self.model.score(X_test_scaled, y_test):.3f}")
        logger.info("\nClassification Report:\n", classification_report(y_test, y_pred))
        
        # Feature importance
        if hasattr(self.model, 'feature_importances_'):
            importance_df = pd.DataFrame({
                'feature': self.feature_names,
                'importance': self.model.feature_importances_
            }).sort_values('importance', ascending=False)
            logger.info("\nFeature Importance:\n", importance_df)
        
        return self.model.score(X_test_scaled, y_test)
    
    def predict(self, X):
        """
        Predict flood risk for new data.
        
        Returns:
            Dictionary with risk class and probabilities
        """
        if not self.is_trained:
            raise ValueError("Model must be trained before prediction")
        
        # Prepare features
        if isinstance(X, pd.DataFrame):
            X = self.prepare_features(X)
        elif isinstance(X, dict):
            X = pd.DataFrame([X])
            X = self.prepare_features(X)
        
        # Scale features
        X_scaled = self.scaler.transform(X)
        
        # Predict
        risk_class = self.model.predict(X_scaled)[0]
        probabilities = self.model.predict_proba(X_scaled)[0]
        
        risk_labels = ['Low', 'Medium', 'High']
        
        return {
            'risk_class': risk_class,
            'risk_label': risk_labels[risk_class],
            'probabilities': {
                'low': float(probabilities[0]),
                'medium': float(probabilities[1]),
                'high': float(probabilities[2])
            },
            'confidence': float(max(probabilities))
        }
    
    def predict_batch(self, X):
        """Predict for multiple samples."""
        if not self.is_trained:
            raise ValueError("Model must be trained before prediction")
        
        if isinstance(X, pd.DataFrame):
            X = self.prepare_features(X)
        
        X_scaled = self.scaler.transform(X)
        risk_classes = self.model.predict(X_scaled)
        probabilities = self.model.predict_proba(X_scaled)
        
        risk_labels = ['Low', 'Medium', 'High']
        results = []
        
        for i in range(len(risk_classes)):
            results.append({
                'risk_class': int(risk_classes[i]),
                'risk_label': risk_labels[risk_classes[i]],
                'probabilities': {
                    'low': float(probabilities[i][0]),
                    'medium': float(probabilities[i][1]),
                    'high': float(probabilities[i][2])
                },
                'confidence': float(max(probabilities[i]))
            })
        
        return results
    
    def save_model(self, path):
        """Save trained model to disk."""
        model_data = {
            'model': self.model,
            'scaler': self.scaler,
            'feature_names': self.feature_names,
            'model_type': self.model_type,
            'is_trained': self.is_trained,
            'n_estimators': self.n_estimators,
            'random_state': self.random_state
        }
        joblib.dump(model_data, path)
        logger.info(f"Model saved to {path}")
    
    def load_model(self, path):
        """Load trained model from disk."""
        model_data = joblib.load(path)
        self.model = model_data['model']
        self.scaler = model_data['scaler']
        self.feature_names = model_data['feature_names']
        self.model_type = model_data['model_type']
        self.is_trained = model_data['is_trained']
        self.n_estimators = model_data['n_estimators']
        self.random_state = model_data['random_state']
        logger.info(f"Model loaded from {path}")