"""
Jal-Setu AI - API Usage Examples
This file demonstrates how to use the Jal-Setu AI API
"""

import requests
import json
from typing import Dict, Any

# API Base URL
API_BASE = "http://localhost:8000"

def check_health():
    """Check API health status."""
    print("=" * 60)
    print("1. Checking API Health")
    print("=" * 60)
    
    response = requests.get(f"{API_BASE}/health")
    data = response.json()
    
    print(json.dumps(data, indent=2))
    print()

def get_model_info():
    """Get model information."""
    print("=" * 60)
    print("2. Getting Model Information")
    print("=" * 60)
    
    response = requests.get(f"{API_BASE}/model/info")
    data = response.json()
    
    print(json.dumps(data, indent=2))
    print()

def single_prediction():
    """Example of single flood risk prediction."""
    print("=" * 60)
    print("3. Single Flood Risk Prediction")
    print("=" * 60)
    
    # Example: High risk scenario
    request_data = {
        "elevation": 125.5,
        "slope": 12.3,
        "flow_accumulation": 2345.67,
        "distance_to_river": 123.45,
        "flood_depth": 2.3,
        "lulc_agriculture": 0.65,
        "lulc_urban": 0.15,
        "population_density": 856,
        "velocity_index": 0.78,
        "location_name": "Patna District",
        "district": "Patna",
        "state": "Bihar"
    }
    
    print("Request Data:")
    print(json.dumps(request_data, indent=2))
    print()
    
    response = requests.post(f"{API_BASE}/predict", json=request_data)
    result = response.json()
    
    print("Prediction Result:")
    print(json.dumps(result, indent=2))
    print()

def batch_prediction():
    """Example of batch flood risk prediction."""
    print("=" * 60)
    print("4. Batch Flood Risk Prediction")
    print("=" * 60)
    
    # Multiple locations
    locations = [
        {
            "elevation": 125.5,
            "slope": 12.3,
            "flow_accumulation": 2345.67,
            "distance_to_river": 123.45,
            "flood_depth": 2.3,
            "lulc_agriculture": 0.65,
            "lulc_urban": 0.15,
            "population_density": 856,
            "velocity_index": 0.78,
            "location_name": "Patna District"
        },
        {
            "elevation": 234.8,
            "slope": 18.7,
            "flow_accumulation": 890.12,
            "distance_to_river": 456.78,
            "flood_depth": 0.8,
            "lulc_agriculture": 0.45,
            "lulc_urban": 0.32,
            "population_density": 1234,
            "velocity_index": 0.45,
            "location_name": "Dehradun District"
        },
        {
            "elevation": 56.7,
            "slope": 1.5,
            "flow_accumulation": 7890.12,
            "distance_to_river": 12.34,
            "flood_depth": 4.5,
            "lulc_agriculture": 0.84,
            "lulc_urban": 0.04,
            "population_density": 123,
            "velocity_index": 0.94,
            "location_name": "Floodplain Area"
        }
    ]
    
    request_data = {"locations": locations}
    
    print(f"Processing {len(locations)} locations...")
    print()
    
    response = requests.post(f"{API_BASE}/predict/batch", json=request_data)
    result = response.json()
    
    print("Batch Prediction Results:")
    print(f"Total Locations: {result['total_locations']}")
    print(f"Summary: {result['summary']}")
    print()
    
    for i, pred in enumerate(result['predictions'], 1):
        print(f"Location {i}: {pred['input_data']['location_name']}")
        print(f"  Risk: {pred['risk_label']} (Confidence: {pred['confidence']:.2%})")
        print(f"  Probabilities: Low={pred['probabilities']['low']:.2%}, "
              f"Medium={pred['probabilities']['medium']:.2%}, "
              f"High={pred['probabilities']['high']:.2%}")
        print()

def chatbot_interaction():
    """Example of chatbot interaction."""
    print("=" * 60)
    print("5. Chatbot Interaction")
    print("=" * 60)
    
    # Example prediction data to provide context
    prediction_data = {
        "risk_class": 2,
        "risk_label": "High",
        "confidence": 0.85,
        "probabilities": {
            "low": 0.05,
            "medium": 0.10,
            "high": 0.85
        },
        "input_data": {
            "flood_depth": 2.3,
            "velocity_index": 0.78,
            "distance_to_river": 123.45,
            "population_density": 856,
            "location_name": "Patna District"
        }
    }
    
    questions = [
        "What does high flood risk mean?",
        "What should we do now?",
        "How urgent is the situation?"
    ]
    
    for question in questions:
        print(f"User: {question}")
        
        request_data = {
            "message": question,
            "previous_risk_data": prediction_data
        }
        
        response = requests.post(f"{API_BASE}/chat", json=request_data)
        result = response.json()
        
        print(f"Assistant: {result['response']}")
        print(f"Type: {result['type']}")
        print(f"Requires Action: {result['requires_action']}")
        print("-" * 40)
        print()

def generate_risk_summary():
    """Example of generating risk summary."""
    print("=" * 60)
    print("6. Generate Risk Summary")
    print("=" * 60)
    
    prediction_data = {
        "risk_class": 2,
        "risk_label": "High",
        "confidence": 0.85,
        "probabilities": {
            "low": 0.05,
            "medium": 0.10,
            "high": 0.85
        },
        "input_data": {
            "flood_depth": 2.3,
            "velocity_index": 0.78,
            "distance_to_river": 123.45,
            "population_density": 856,
            "location_name": "Patna District",
            "district": "Patna"
        }
    }
    
    response = requests.post(f"{API_BASE}/chat/summary", json=prediction_data)
    result = response.json()
    
    print("AI-Generated Risk Summary:")
    print(result['summary'])
    print()

def generate_action_plan():
    """Example of generating action plan."""
    print("=" * 60)
    print("7. Generate Action Plan")
    print("=" * 60)
    
    prediction_data = {
        "risk_class": 2,
        "risk_label": "High",
        "confidence": 0.85,
        "input_data": {
            "flood_depth": 2.3,
            "velocity_index": 0.78,
            "population_density": 856,
            "location_name": "Patna District"
        }
    }
    
    response = requests.post(f"{API_BASE}/chat/action-plan", json=prediction_data)
    result = response.json()
    
    print(f"Risk Level: {result['risk_level'].upper()}")
    print("\nAction Plan:")
    print(result['action_plan'])
    print()

def compare_scenarios():
    """Example of comparing different flood scenarios."""
    print("=" * 60)
    print("8. Scenario Comparison")
    print("=" * 60)
    
    scenarios = [
        {
            "name": "Low Flood (+0.5m)",
            "elevation": 200.0,
            "slope": 5.0,
            "flow_accumulation": 500.0,
            "distance_to_river": 500.0,
            "flood_depth": 0.5,
            "lulc_agriculture": 0.5,
            "lulc_urban": 0.2,
            "population_density": 500,
            "velocity_index": 0.3,
            "location_name": "Scenario 1"
        },
        {
            "name": "Medium Flood (+1.5m)",
            "elevation": 200.0,
            "slope": 5.0,
            "flow_accumulation": 1000.0,
            "distance_to_river": 200.0,
            "flood_depth": 1.5,
            "lulc_agriculture": 0.5,
            "lulc_urban": 0.2,
            "population_density": 500,
            "velocity_index": 0.6,
            "location_name": "Scenario 2"
        },
        {
            "name": "High Flood (+3.0m)",
            "elevation": 200.0,
            "slope": 5.0,
            "flow_accumulation": 2000.0,
            "distance_to_river": 50.0,
            "flood_depth": 3.0,
            "lulc_agriculture": 0.5,
            "lulc_urban": 0.2,
            "population_density": 500,
            "velocity_index": 0.9,
            "location_name": "Scenario 3"
        }
    ]
    
    print("Comparing flood scenarios:\n")
    
    for scenario in scenarios:
        response = requests.post(f"{API_BASE}/predict", json=scenario)
        result = response.json()
        
        print(f"{scenario['name']}")
        print(f"  Risk Level: {result['risk_label']}")
        print(f"  Confidence: {result['confidence']:.2%}")
        print(f"  High Risk Probability: {result['probabilities']['high']:.2%}")
        print()

def main():
    """Run all examples."""
    print("\n")
    print("*" * 60)
    print("*  Jal-Setu AI - API Usage Examples")
    print("*" * 60)
    print("\n")
    
    try:
        # Health check
        check_health()
        
        # Model info
        get_model_info()
        
        # Predictions
        single_prediction()
        batch_prediction()
        compare_scenarios()
        
        # Chatbot
        chatbot_interaction()
        generate_risk_summary()
        generate_action_plan()
        
        print("=" * 60)
        print("All examples completed successfully!")
        print("=" * 60)
        
    except requests.exceptions.ConnectionError:
        print("\nERROR: Could not connect to API.")
        print("Please make sure the server is running:")
        print("  python -m uvicorn api.main:app --reload")
    except Exception as e:
        print(f"\nERROR: {str(e)}")

if __name__ == "__main__":
    main()