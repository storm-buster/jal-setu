import openai
from typing import Dict, Any, Optional, List
from datetime import datetime
import logging
from config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class FloodShieldChatbot:
    """
    GenAI-powered chatbot for flood risk interpretation and decision support.
    Converts ML model outputs into actionable administrative guidance.
    """
    
    def __init__(self):
        self.client = openai.OpenAI(api_key=settings.openai_api_key)
        self.model = settings.openai_model
        self.system_prompt = self._build_system_prompt()
    
    def _build_system_prompt(self) -> str:
        """Build the system prompt for the chatbot."""
        return """You are Jal-Setu AI, an expert flood risk decision support assistant. Your role is to help government officials and emergency responders understand flood risk assessments and make informed decisions.

Key Context:
- You work with a physics-first flood modelling system that uses LiDAR terrain data, ArcGIS hydrology modelling, and ML-based risk refinement
- Risk levels: LOW (0), MEDIUM (1), HIGH (2)
- The system analyzes terrain features (elevation, slope), hydrology (flow accumulation, velocity), exposure (population density, land use), and flood scenarios

Your Responsibilities:
1. Interpret flood risk predictions clearly
2. Provide actionable recommendations based on risk level
3. Explain technical terms in simple language
4. Suggest preparedness and response actions
5. Help prioritize evacuation and resource allocation
6. Answer questions about flood risk factors

Guidelines:
- Be concise and direct - government officials need quick, clear answers
- Use bullet points for recommendations
- Provide risk-appropriate language (more urgent for high risk)
- Suggest specific actions for each risk level
- Acknowledge limitations of the system
- Emphasize that this is decision support, not a replacement for expert judgment

Risk Level Guidelines:
- LOW: Monitor situation, maintain preparedness, no immediate action needed
- MEDIUM: Prepare for potential evacuation, monitor closely, alert vulnerable populations
- HIGH: Initiate evacuation procedures, deploy emergency resources, activate response teams

Always maintain a professional, authoritative but supportive tone. Prioritize public safety in all recommendations."""
    
    def _build_context(self, risk_data: Optional[Dict[str, Any]] = None) -> str:
        """Build context from flood risk data."""
        if not risk_data:
            return "No specific flood risk data provided. General flood risk consultation mode."
        
        context_parts = [
            f"Current Flood Risk Assessment:",
            f"Risk Level: {risk_data.get('risk_label', 'Unknown').upper()}",
            f"Confidence: {risk_data.get('confidence', 0) * 100:.1f}%",
            "",
            "Key Risk Factors:",
            f"- Flood Depth: {risk_data.get('input_data', {}).get('flood_depth', 0):.2f} meters",
            f"- Velocity Index: {risk_data.get('input_data', {}).get('velocity_index', 0):.2f}",
            f"- Distance from River: {risk_data.get('input_data', {}).get('distance_to_river', 0):.0f} meters",
            f"- Population Density: {risk_data.get('input_data', {}).get('population_density', 0):.0f} people/sq km",
        ]
        
        location = risk_data.get('input_data', {}).get('location_name')
        if location:
            context_parts.insert(1, f"Location: {location}")
        
        return "\n".join(context_parts)
    
    def chat(
        self,
        message: str,
        risk_data: Optional[Dict[str, Any]] = None,
        conversation_history: Optional[List[Dict[str, str]]] = None
    ) -> Dict[str, Any]:
        """
        Process user message and generate response.
        
        Args:
            message: User's message/question
            risk_data: Optional flood risk prediction data
            conversation_history: Optional conversation history for context
        
        Returns:
            Dictionary with response, type, confidence, and requires_action flag
        """
        try:
            # Build messages
            messages = [
                {"role": "system", "content": self.system_prompt}
            ]
            
            # Add context if risk data is provided
            if risk_data:
                context = self._build_context(risk_data)
                messages.append({
                    "role": "system",
                    "content": f"CONTEXT DATA:\n{context}\n\nUse this context when answering questions about current risk assessment."
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
                max_tokens=800
            )
            
            assistant_message = response.choices[0].message.content
            
            # Analyze response type
            response_type = self._classify_response_type(assistant_message)
            requires_action = self._check_action_required(assistant_message, risk_data)
            
            return {
                "response": assistant_message,
                "type": response_type,
                "confidence": 0.85,  # Default confidence for LLM
                "requires_action": requires_action
            }
            
        except Exception as e:
            logger.error(f"Error generating chatbot response: {str(e)}")
            return {
                "response": "I apologize, but I'm having difficulty processing your request right now. Please try again or contact technical support if the issue persists.",
                "type": "error",
                "confidence": 0.0,
                "requires_action": False
            }
    
    def _classify_response_type(self, response: str) -> str:
        """Classify the type of response."""
        response_lower = response.lower()
        
        if any(word in response_lower for word in ['evacuate', 'evacuation', 'immediate', 'urgent', 'emergency']):
            return 'alert'
        elif any(word in response_lower for word in ['recommend', 'should', 'action', 'step']):
            return 'recommendation'
        elif any(word in response_lower for word in ['explain', 'because', 'due to', 'factor']):
            return 'explanation'
        else:
            return 'information'
    
    def _check_action_required(self, response: str, risk_data: Optional[Dict[str, Any]] = None) -> bool:
        """Determine if user action is required based on response and risk level."""
        response_lower = response.lower()
        
        # Action keywords
        action_keywords = ['evacuate', 'implement', 'deploy', 'activate', 'contact', 'prepare']
        
        if any(keyword in response_lower for keyword in action_keywords):
            return True
        
        # High risk always requires action
        if risk_data and risk_data.get('risk_class') == 2:  # HIGH risk
            return True
        
        return False
    
    def generate_risk_summary(self, risk_data: Dict[str, Any]) -> str:
        """Generate a comprehensive risk summary based on prediction."""
        prompt = f"""Based on this flood risk assessment, provide a concise executive summary for a district administrator:

{self._build_context(risk_data)}

Please provide:
1. A clear assessment of the current situation
2. Top 3 immediate priorities
3. Recommended response level (monitor/prepare/act)
4. Timeline for next review

Keep it under 200 words."""
        
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": self.system_prompt},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.6,
                max_tokens=300
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            logger.error(f"Error generating risk summary: {str(e)}")
            return "Unable to generate risk summary at this time. Please review the detailed risk assessment manually."
    
    def generate_action_plan(self, risk_data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate a detailed action plan based on risk level."""
        risk_level = risk_data.get('risk_label', 'LOW').lower()
        
        prompt = f"""Generate a specific action plan for a {risk_level} flood risk situation:

{self._build_context(risk_data)}

Provide actions in these categories:
1. Immediate Actions (next 2-4 hours)
2. Short-term Actions (next 24 hours)
3. Communication Requirements
4. Resource Priorities

Format as a structured action plan with clear timelines."""
        
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": self.system_prompt},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=600
            )
            
            return {
                "action_plan": response.choices[0].message.content,
                "risk_level": risk_level,
                "generated_at": str(datetime.now())
            }
            
        except Exception as e:
            logger.error(f"Error generating action plan: {str(e)}")
            return {
                "action_plan": "Action plan generation failed. Please consult standard operating procedures.",
                "risk_level": risk_level,
                "error": str(e)
            }