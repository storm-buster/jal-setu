import openai
from typing import Dict, Any, Optional, List
from datetime import datetime
import logging
from config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class FloodShieldEnhancedChatbot:
    """
    Enhanced GenAI-powered chatbot with predictive capabilities and land impact analysis.
    Integrates directly with ML model for intelligent flood risk assessment.
    """
    
    def __init__(self, ml_model=None):
        self.client = openai.OpenAI(api_key=settings.openai_api_key)
        self.model = settings.openai_model
        self.ml_model = ml_model  # Reference to ML model
        self.system_prompt = self._build_system_prompt()
        
        # Regional data for context
        self.regional_data = {
            'Bihar': {
                'type': 'Plains',
                'flood_type': 'Riverine slow floods',
                'key_rivers': ['Ganga', 'Gandak', 'Kosi', 'Bagmati', 'Burhi Gandak'],
                'vulnerability': 'High due to flat terrain and major rivers',
                'districts': ['Bhagalpur', 'Muzaffarpur', 'Begusarai', 'Patna', 'Gaya']
            },
            'Jharkhand': {
                'type': 'Plateau',
                'flood_type': 'Flash floods',
                'key_rivers': ['Damodar', 'Subarnarekha', 'Barakar', 'Koel'],
                'vulnerability': 'Moderate due to hilly terrain but prone to flash floods',
                'districts': ['Ranchi', 'Hazaribagh', 'Dhanbad', 'Jamshedpur']
            }
        }
    
    def _build_system_prompt(self) -> str:
        """Build the enhanced system prompt for the chatbot."""
        return """You are Jal-Setu AI, an advanced flood risk decision support assistant with predictive capabilities. You have access to a Machine Learning model trained on 1000+ samples from Bihar and Jharkhand regions.

Your Enhanced Capabilities:
1. **Predictive Analysis**: You can analyze flood risk based on terrain, hydrology, and exposure data
2. **Land Impact Assessment**: You can predict which specific land areas will be affected
3. **Regional Expertise**: You understand the unique flood characteristics of Bihar (plains/riverine) and Jharkhand (plateau/flash floods)
4. **Data-Driven Insights**: You use ML model predictions to provide accurate risk assessments

Regional Context:

BIHAR (Plains Region):
- Districts: Bhagalpur, Muzaffarpur, Begusarai, Patna, Gaya
- Terrain: Flat, low-lying (30-200m elevation)
- Flood Type: Slow riverine floods from major rivers (Ganga, Kosi, Gandak)
- High Risk Areas: River banks, low-lying plains, agricultural lands
- Impact Duration: Longer (days to weeks)
- Primary Concerns: Embankment breaches, water logging, crop damage

JHARKHAND (Plateau Region):
- Districts: Ranchi, Hazaribagh, Dhanbad, Jamshedpur
- Terrain: Hilly, elevated (150-400m elevation)
- Flood Type: Flash floods with high velocity
- High Risk Areas: River valleys, low-lying areas, urban drainage
- Impact Duration: Shorter (hours to days) but more destructive
- Primary Concerns: Sudden water surges, debris flows, infrastructure damage

Risk Classification:
- LOW (0): Monitor situation, no immediate action required
- MEDIUM (1): Prepare for potential impact, monitor closely, alert vulnerable populations
- HIGH (2): Initiate evacuation, deploy emergency resources, activate response teams

Key Risk Factors (in order of importance):
1. Distance to river (closest proximity = highest risk)
2. Depth-to-elevation ratio (flood depth relative to terrain)
3. Flood depth (water level above ground)
4. Velocity index (destructive potential of water flow)
5. Population exposure (people × flood depth)

Your Responsibilities:
1. Make risk predictions using available terrain and hydrology data
2. Identify specific land areas that will be affected
3. Provide location-specific recommendations based on regional characteristics
4. Explain WHY certain areas are at risk (terrain, river proximity, etc.)
5. Generate actionable response plans
6. Estimate potential population impact
7. Suggest priority areas for intervention

Guidelines:
- Always base predictions on the provided data and ML model outputs
- Be specific about WHICH LAND AREAS will be affected
- Consider regional characteristics in your analysis
- Provide detailed reasoning for risk assessments
- Recommend specific actions for different risk levels
- Include population impact estimates when possible
- Suggest safe zones and evacuation routes
- Acknowledge model confidence levels

When analyzing land impact, consider:
- River banks and floodplains (highest risk)
- Low-lying agricultural areas
- Urban drainage basins
- Areas downstream of embankments
- Historical flood-prone zones

Always maintain a professional, authoritative yet supportive tone. Prioritize public safety in all recommendations."""

    def predict_flood_risk(
        self,
        elevation: float,
        slope: float,
        flow_accumulation: float,
        distance_to_river: float,
        flood_depth: float,
        lulc_agriculture: float,
        lulc_urban: float,
        population_density: float,
        velocity_index: float,
        location_name: Optional[str] = None,
        region: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Make a flood risk prediction using the ML model.
        
        Returns comprehensive prediction with land impact analysis.
        """
        if not self.ml_model or not self.ml_model.is_trained:
            raise ValueError("ML model not available for prediction")
        
        # Prepare input data
        input_data = {
            'elevation': elevation,
            'slope': slope,
            'flow_accumulation': flow_accumulation,
            'distance_to_river': distance_to_river,
            'flood_depth': flood_depth,
            'lulc_agriculture': lulc_agriculture,
            'lulc_urban': lulc_urban,
            'population_density': population_density,
            'velocity_index': velocity_index
        }
        
        # Get ML prediction
        ml_prediction = self.ml_model.predict(input_data)
        
        # Build comprehensive prediction with land impact analysis
        prediction = {
            'ml_prediction': ml_prediction,
            'input_data': input_data,
            'location_name': location_name,
            'region': region,
            'land_impact_analysis': self._analyze_land_impact(input_data, ml_prediction, region),
            'regional_context': self._get_regional_context(region)
        }
        
        return prediction
    
    def _analyze_land_impact(
        self,
        input_data: Dict[str, float],
        prediction: Dict[str, Any],
        region: Optional[str]
    ) -> Dict[str, Any]:
        """Analyze which land areas will be affected."""
        
        impact_analysis = {
            'affected_land_types': [],
            'risk_factors': [],
            'safe_zones': [],
            'evacuation_priorities': []
        }
        
        # Analyze based on flood depth
        flood_depth = input_data['flood_depth']
        distance_to_river = input_data['distance_to_river']
        elevation = input_data['elevation']
        
        # Affected land types based on depth
        if flood_depth > 3.0:
            impact_analysis['affected_land_types'].extend([
                'Deep floodplains',
                'Agricultural lands (complete submergence)',
                'Low-lying residential areas',
                'River banks and embankments'
            ])
            impact_analysis['severity'] = 'Severe'
        elif flood_depth > 1.5:
            impact_analysis['affected_land_types'].extend([
                'Floodplains',
                'Agricultural lands (partial)',
                'Ground-floor residential areas',
                'Low-lying roads'
            ])
            impact_analysis['severity'] = 'Moderate to Severe'
        else:
            impact_analysis['affected_land_types'].extend([
                'River banks',
                'Low-lying agricultural patches',
                'Drainage channels',
                'Some road networks'
            ])
            impact_analysis['severity'] = 'Moderate'
        
        # Risk factors
        if distance_to_river < 100:
            impact_analysis['risk_factors'].append('Very close to river - immediate impact zone')
            impact_analysis['affected_land_types'].insert(0, 'Immediate river bank zone (0-100m)')
        elif distance_to_river < 300:
            impact_analysis['risk_factors'].append('Near river - high impact zone')
            impact_analysis['affected_land_types'].append('Near-river zone (100-300m)')
        
        if elevation < 80:
            impact_analysis['risk_factors'].append('Low elevation - natural water accumulation zone')
        
        if input_data['velocity_index'] > 0.8:
            impact_analysis['risk_factors'].append('High velocity - flash flood potential')
            impact_analysis['affected_land_types'].append('Flash flood channels')
        
        # Safe zones (areas likely to remain safe)
        if elevation > 200:
            impact_analysis['safe_zones'].append('High elevation areas (>200m)')
        if distance_to_river > 500:
            impact_analysis['safe_zones'].append('Areas far from rivers (>500m)')
        if slope > 20:
            impact_analysis['safe_zones'].append('Steep slopes (water runoff, not accumulation)')
        
        # Evacuation priorities
        if prediction['risk_label'] == 'High':
            impact_analysis['evacuation_priorities'].extend([
                'Immediate: Areas within 100m of river',
                'Priority: Low-lying residential zones',
                'Priority: Agricultural communities',
                'Monitor: Areas within 300m of river'
            ])
        elif prediction['risk_label'] == 'Medium':
            impact_analysis['evacuation_priorities'].extend([
                'Prepare: Areas within 200m of river',
                'Alert: Low-lying areas',
                'Monitor: All river-side communities'
            ])
        
        return impact_analysis
    
    def _get_regional_context(self, region: Optional[str]) -> Optional[Dict[str, Any]]:
        """Get regional context for the prediction."""
        if region and region in self.regional_data:
            return self.regional_data[region]
        return None
    
    def chat_with_prediction(
        self,
        message: str,
        prediction_data: Optional[Dict[str, Any]] = None,
        conversation_history: Optional[List[Dict[str, str]]] = None
    ) -> Dict[str, Any]:
        """
        Chat with the assistant using prediction data for context.
        """
        try:
            messages = [
                {"role": "system", "content": self.system_prompt}
            ]
            
            # Add prediction context if available
            if prediction_data:
                context = self._build_prediction_context(prediction_data)
                messages.append({
                    "role": "system",
                    "content": f"CURRENT PREDICTION DATA:\n{context}\n\nUse this data to provide specific, data-driven answers about flood risk and land impact."
                })
            
            # Add conversation history
            if conversation_history:
                messages.extend(conversation_history)
            
            # Add current message
            messages.append({"role": "user", "content": message})
            
            # Generate response
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=0.7,
                max_tokens=1000
            )
            
            assistant_message = response.choices[0].message.content
            
            return {
                "response": assistant_message,
                "type": self._classify_response_type(assistant_message),
                "confidence": 0.85,
                "requires_action": self._check_action_required(assistant_message, prediction_data)
            }
            
        except Exception as e:
            logger.error(f"Error generating chatbot response: {str(e)}")
            return {
                "response": "I apologize, but I'm having difficulty processing your request. The system may be experiencing issues.",
                "type": "error",
                "confidence": 0.0,
                "requires_action": False
            }
    
    def _build_prediction_context(self, prediction_data: Dict[str, Any]) -> str:
        """Build detailed context from prediction data."""
        context_parts = []
        
        ml_pred = prediction_data.get('ml_prediction', {})
        input_data = prediction_data.get('input_data', {})
        land_impact = prediction_data.get('land_impact_analysis', {})
        regional = prediction_data.get('regional_context')
        
        # Risk assessment
        context_parts.append(f"RISK ASSESSMENT:")
        context_parts.append(f"Risk Level: {ml_pred.get('risk_label', 'Unknown').upper()}")
        context_parts.append(f"Confidence: {ml_pred.get('confidence', 0) * 100:.1f}%")
        context_parts.append("")
        
        # Location info
        if prediction_data.get('location_name'):
            context_parts.append(f"Location: {prediction_data['location_name']}")
        if prediction_data.get('region'):
            context_parts.append(f"Region: {prediction_data['region']}")
        context_parts.append("")
        
        # Key parameters
        context_parts.append(f"KEY RISK PARAMETERS:")
        context_parts.append(f"- Flood Depth: {input_data.get('flood_depth', 0):.2f} meters")
        context_parts.append(f"- Distance from River: {input_data.get('distance_to_river', 0):.0f} meters")
        context_parts.append(f"- Velocity Index: {input_data.get('velocity_index', 0):.2f}")
        context_parts.append(f"- Elevation: {input_data.get('elevation', 0):.1f} meters")
        context_parts.append(f"- Population Density: {input_data.get('population_density', 0):.0f} people/sq km")
        context_parts.append("")
        
        # Land impact
        context_parts.append(f"LAND IMPACT ANALYSIS:")
        context_parts.append(f"Severity: {land_impact.get('severity', 'Unknown')}")
        context_parts.append(f"Affected Land Types: {', '.join(land_impact.get('affected_land_types', []))}")
        context_parts.append(f"Key Risk Factors: {len(land_impact.get('risk_factors', []))} identified")
        context_parts.append(f"Safe Zones: {len(land_impact.get('safe_zones', []))} identified")
        context_parts.append("")
        
        # Regional context
        if regional:
            context_parts.append(f"REGIONAL CONTEXT:")
            context_parts.append(f"Terrain Type: {regional.get('type', 'Unknown')}")
            context_parts.append(f"Flood Type: {regional.get('flood_type', 'Unknown')}")
            context_parts.append(f"Vulnerability: {regional.get('vulnerability', 'Unknown')}")
            if regional.get('key_rivers'):
                context_parts.append(f"Major Rivers: {', '.join(regional['key_rivers'])}")
        
        return "\n".join(context_parts)
    
    def _classify_response_type(self, response: str) -> str:
        """Classify the type of response."""
        response_lower = response.lower()
        
        if any(word in response_lower for word in ['affected land', 'land impact', 'areas affected', 'flood zone']):
            return 'land_impact'
        elif any(word in response_lower for word in ['evacuate', 'evacuation', 'immediate', 'urgent', 'emergency']):
            return 'alert'
        elif any(word in response_lower for word in ['recommend', 'should', 'action', 'step']):
            return 'recommendation'
        elif any(word in response_lower for word in ['predict', 'prediction', 'risk level']):
            return 'prediction'
        elif any(word in response_lower for word in ['explain', 'because', 'due to', 'factor']):
            return 'explanation'
        else:
            return 'information'
    
    def _check_action_required(self, response: str, prediction_data: Optional[Dict[str, Any]] = None) -> bool:
        """Determine if user action is required."""
        response_lower = response.lower()
        
        action_keywords = ['evacuate', 'implement', 'deploy', 'activate', 'contact', 'prepare', 'move']
        
        if any(keyword in response_lower for keyword in action_keywords):
            return True
        
        # High risk always requires action
        if prediction_data and prediction_data.get('ml_prediction', {}).get('risk_class') == 2:
            return True
        
        return False