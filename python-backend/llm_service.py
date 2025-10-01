"""
LLM Service for processing natural language queries about networking data.
Supports multiple LLM providers: OpenAI, Anthropic, and local models.
"""

import os
import json
import logging
import asyncio
from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional, Union
from datetime import datetime
from enum import Enum
import aiohttp
from pydantic import BaseModel

logger = logging.getLogger(__name__)

class LLMProvider(str, Enum):
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    LOCAL = "local"

class QueryType(str, Enum):
    COMPANY_RANKING = "company_ranking"
    CONTACT_LIST = "contact_list"
    COMPANY_CONTACTS = "company_contacts"
    INDUSTRY_CONTACTS = "industry_contacts"
    ANALYTICS = "analytics"
    VISUALIZATION = "visualization"
    GENERAL = "general"

class VisualizationType(str, Enum):
    CHART = "chart"
    TABLE = "table"
    CARDS = "cards"
    TEXT = "text"

class LLMQuery(BaseModel):
    query: str
    user_id: str
    context: Optional[Dict[str, Any]] = {}
    conversation_history: Optional[List[Dict[str, str]]] = []

class LLMResponse(BaseModel):
    query_type: QueryType
    api_calls: List[Dict[str, Any]]
    visualization_type: VisualizationType
    title: str
    summary: str
    filters: Dict[str, Any] = {}
    confidence: float = 0.0
    reasoning: Optional[str] = None

class NetworkDataContext(BaseModel):
    """Context about available network data and APIs"""
    total_contacts: int = 0
    total_companies: int = 0
    target_companies: List[str] = []
    available_apis: List[str] = []
    recent_queries: List[str] = []

class BaseLLMProvider(ABC):
    """Abstract base class for LLM providers"""
    
    def __init__(self, api_key: Optional[str] = None, **kwargs):
        self.api_key = api_key
        self.config = kwargs
    
    @abstractmethod
    async def generate_response(self, prompt: str, **kwargs) -> str:
        """Generate a response from the LLM"""
        pass
    
    @abstractmethod
    def get_provider_name(self) -> str:
        """Get the provider name"""
        pass

class OpenAIProvider(BaseLLMProvider):
    """OpenAI GPT provider"""
    
    def __init__(self, api_key: Optional[str] = None, model: str = "gpt-4", **kwargs):
        super().__init__(api_key, **kwargs)
        self.model = model
        self.base_url = "https://api.openai.com/v1/chat/completions"
    
    async def generate_response(self, prompt: str, **kwargs) -> str:
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": self.model,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": kwargs.get("temperature", 0.1),
            "max_tokens": kwargs.get("max_tokens", 1000)
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(self.base_url, headers=headers, json=payload) as response:
                if response.status != 200:
                    error_text = await response.text()
                    raise Exception(f"OpenAI API error: {response.status} - {error_text}")
                
                result = await response.json()
                return result["choices"][0]["message"]["content"]
    
    def get_provider_name(self) -> str:
        return "OpenAI"

class AnthropicProvider(BaseLLMProvider):
    """Anthropic Claude provider"""
    
    def __init__(self, api_key: Optional[str] = None, model: str = "claude-3-sonnet-20240229", **kwargs):
        super().__init__(api_key, **kwargs)
        self.model = model
        self.base_url = "https://api.anthropic.com/v1/messages"
    
    async def generate_response(self, prompt: str, **kwargs) -> str:
        headers = {
            "x-api-key": self.api_key,
            "Content-Type": "application/json",
            "anthropic-version": "2023-06-01"
        }
        
        payload = {
            "model": self.model,
            "max_tokens": kwargs.get("max_tokens", 1000),
            "messages": [{"role": "user", "content": prompt}],
            "temperature": kwargs.get("temperature", 0.1)
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(self.base_url, headers=headers, json=payload) as response:
                if response.status != 200:
                    error_text = await response.text()
                    raise Exception(f"Anthropic API error: {response.status} - {error_text}")
                
                result = await response.json()
                return result["content"][0]["text"]
    
    def get_provider_name(self) -> str:
        return "Anthropic"

class LocalLLMProvider(BaseLLMProvider):
    """Local LLM provider (e.g., Ollama, local OpenAI-compatible API)"""
    
    def __init__(self, base_url: str = "http://localhost:11434", model: str = "llama2", **kwargs):
        super().__init__(**kwargs)
        self.base_url = base_url.rstrip('/')
        self.model = model
    
    async def generate_response(self, prompt: str, **kwargs) -> str:
        # Ollama API format
        payload = {
            "model": self.model,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": kwargs.get("temperature", 0.1),
                "num_predict": kwargs.get("max_tokens", 1000)
            }
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(f"{self.base_url}/api/generate", json=payload) as response:
                if response.status != 200:
                    error_text = await response.text()
                    raise Exception(f"Local LLM API error: {response.status} - {error_text}")
                
                result = await response.json()
                return result.get("response", "")
    
    def get_provider_name(self) -> str:
        return f"Local ({self.model})"

class NetworkQueryLLMService:
    """Main service for processing network queries using LLMs"""
    
    def __init__(self):
        self.providers: Dict[LLMProvider, BaseLLMProvider] = {}
        self.default_provider = None
        self._setup_providers()
    
    def _setup_providers(self):
        """Initialize available LLM providers based on configuration"""
        
        # OpenAI
        openai_key = os.getenv("OPENAI_API_KEY")
        if openai_key:
            self.providers[LLMProvider.OPENAI] = OpenAIProvider(
                api_key=openai_key,
                model=os.getenv("OPENAI_MODEL", "gpt-4")
            )
            if not self.default_provider:
                self.default_provider = LLMProvider.OPENAI
        
        # Anthropic
        anthropic_key = os.getenv("ANTHROPIC_API_KEY")
        if anthropic_key:
            self.providers[LLMProvider.ANTHROPIC] = AnthropicProvider(
                api_key=anthropic_key,
                model=os.getenv("ANTHROPIC_MODEL", "claude-3-sonnet-20240229")
            )
            if not self.default_provider:
                self.default_provider = LLMProvider.ANTHROPIC
        
        # Local LLM
        local_url = os.getenv("LOCAL_LLM_URL", "http://localhost:11434")
        local_model = os.getenv("LOCAL_LLM_MODEL", "llama2")
        try:
            self.providers[LLMProvider.LOCAL] = LocalLLMProvider(
                base_url=local_url,
                model=local_model
            )
            if not self.default_provider:
                self.default_provider = LLMProvider.LOCAL
        except Exception as e:
            logger.warning(f"Local LLM provider not available: {e}")
        
        if not self.providers:
            logger.warning("No LLM providers configured. Service will use fallback responses.")
    
    def get_available_providers(self) -> List[str]:
        """Get list of available provider names"""
        return [provider.get_provider_name() for provider in self.providers.values()]
    
    def _build_system_prompt(self, context: NetworkDataContext) -> str:
        """Build the system prompt with context about available data and APIs"""
        
        available_apis = [
            "/api/v1/contacts/grouped-by-company - Get contacts grouped by company",
            "/api/v1/contacts/stats - Get contact statistics", 
            "/api/v1/target-companies - Get user's target companies",
            "/api/v1/contacts/target-companies - Get contacts at target companies",
            "/api/v1/contacts - Get contacts with filtering"
        ]
        
        return f"""You are an AI assistant that helps users query their professional network data. 

AVAILABLE DATA:
- Total contacts: {context.total_contacts}
- Total companies: {context.total_companies}
- Target companies: {', '.join(context.target_companies) if context.target_companies else 'None configured'}

AVAILABLE APIs:
{chr(10).join(f"- {api}" for api in available_apis)}

QUERY TYPES:
- company_ranking: Show top companies by contact count
- contact_list: List contacts with filtering
- company_contacts: Show contacts at specific companies
- industry_contacts: Show contacts in specific industries
- analytics: Statistical analysis of network data
- visualization: Create charts or visual representations
- general: General questions about the network

VISUALIZATION TYPES:
- table: Tabular data display
- cards: Card-based contact display
- chart: Charts and graphs
- text: Text-based responses

Your task is to analyze the user's natural language query and return a JSON response with:
1. query_type: The type of query (from the list above)
2. api_calls: Array of API calls needed to fulfill the request
3. visualization_type: How to display the results
4. title: A descriptive title for the response
5. summary: A brief summary of what will be shown
6. filters: Any filters to apply to the data
7. confidence: Your confidence in the interpretation (0.0-1.0)
8. reasoning: Brief explanation of your interpretation

IMPORTANT: Always respond with valid JSON only. No additional text or explanations outside the JSON.

Example response:
{{
  "query_type": "company_ranking",
  "api_calls": [
    {{
      "endpoint": "/api/v1/contacts/grouped-by-company",
      "method": "GET",
      "params": {{"require_title": true, "target_companies_only": false}}
    }}
  ],
  "visualization_type": "table",
  "title": "Top 10 Companies by Contact Count",
  "summary": "Showing the companies with the most contacts in your network",
  "filters": {{"limit": 10}},
  "confidence": 0.95,
  "reasoning": "User asked for top companies, which maps to company ranking query"
}}"""

    async def process_query(
        self, 
        query: LLMQuery, 
        context: NetworkDataContext,
        provider: Optional[LLMProvider] = None
    ) -> LLMResponse:
        """Process a natural language query and return structured response"""
        
        if not self.providers:
            # Fallback response when no LLM providers are available
            return self._generate_fallback_response(query.query)
        
        # Use specified provider or default
        selected_provider = provider or self.default_provider
        if selected_provider not in self.providers:
            raise ValueError(f"Provider {selected_provider} not available")
        
        llm_provider = self.providers[selected_provider]
        
        # Build the full prompt
        system_prompt = self._build_system_prompt(context)
        
        # Add conversation history if available
        conversation_context = ""
        if query.conversation_history:
            conversation_context = "\n\nCONVERSATION HISTORY:\n"
            for msg in query.conversation_history[-5:]:  # Last 5 messages
                role = msg.get("role", "user")
                content = msg.get("content", "")
                conversation_context += f"{role.upper()}: {content}\n"
        
        full_prompt = f"""{system_prompt}

{conversation_context}

USER QUERY: {query.query}

Respond with JSON only:"""
        
        try:
            # Generate response from LLM
            response_text = await llm_provider.generate_response(
                full_prompt,
                temperature=0.1,
                max_tokens=1000
            )
            
            # Parse JSON response
            response_data = json.loads(response_text.strip())
            
            # Validate and create LLMResponse
            return LLMResponse(**response_data)
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse LLM response as JSON: {e}")
            logger.error(f"Raw response: {response_text}")
            return self._generate_fallback_response(query.query)
        
        except Exception as e:
            logger.error(f"Error processing query with {llm_provider.get_provider_name()}: {e}")
            return self._generate_fallback_response(query.query)
    
    def _generate_fallback_response(self, query: str) -> LLMResponse:
        """Generate a fallback response when LLM processing fails"""
        
        query_lower = query.lower()
        
        # Enhanced rule-based fallback for company ranking queries
        company_ranking_keywords = [
            ("top" in query_lower and ("companies" in query_lower or "company" in query_lower)),
            ("most contacts" in query_lower and ("companies" in query_lower or "company" in query_lower)),
            ("which companies" in query_lower and ("most" in query_lower or "top" in query_lower)),
            ("companies with" in query_lower and ("most" in query_lower or "contacts" in query_lower)),
            ("rank" in query_lower and ("companies" in query_lower or "company" in query_lower)),
            ("best" in query_lower and ("companies" in query_lower or "company" in query_lower)),
            ("largest" in query_lower and ("companies" in query_lower or "company" in query_lower))
        ]
        
        if any(company_ranking_keywords):
            return LLMResponse(
                query_type=QueryType.COMPANY_RANKING,
                api_calls=[{
                    "endpoint": "/api/v1/contacts/grouped-by-company",
                    "method": "GET",
                    "params": {"require_title": True, "target_companies_only": False}
                }],
                visualization_type=VisualizationType.TABLE,
                title="Top Companies by Contact Count",
                summary="Showing companies with the most contacts in your network",
                filters={"limit": 10},
                confidence=0.8,
                reasoning="Fallback rule-based parsing detected company ranking query"
            )
        
        elif "contacts at" in query_lower or "people at" in query_lower:
            # Extract company name
            company = None
            if "at " in query_lower:
                parts = query_lower.split("at ")
                if len(parts) > 1:
                    company = parts[1].strip()
            
            return LLMResponse(
                query_type=QueryType.COMPANY_CONTACTS,
                api_calls=[{
                    "endpoint": "/api/v1/contacts/grouped-by-company",
                    "method": "GET",
                    "params": {"require_title": True}
                }],
                visualization_type=VisualizationType.CARDS,
                title=f"Contacts at {company}" if company else "Company Contacts",
                summary=f"Showing contacts at {company}" if company else "Showing contacts at specified company",
                filters={"company": company} if company and company.strip() else {},
                confidence=0.6,
                reasoning="Fallback rule-based parsing detected company contacts query"
            )
        
        # Industry-based queries
        elif any(keyword in query_lower for keyword in ["industry", "sector", "field"]) and any(keyword in query_lower for keyword in ["contacts", "people", "in"]):
            # Extract industry name
            industry = None
            industry_keywords = ["fintech", "fin-tech", "finance", "technology", "tech", "healthcare", "consulting", "marketing", "sales", "education", "retail", "manufacturing", "real estate", "media", "entertainment", "nonprofit", "government", "automotive", "energy", "telecommunications", "biotech", "pharmaceutical", "legal", "accounting", "insurance", "banking", "investment", "venture capital", "private equity", "startup", "saas", "software", "hardware", "ai", "artificial intelligence", "machine learning", "data science", "cybersecurity", "cloud", "mobile", "gaming", "e-commerce", "logistics", "supply chain", "construction", "architecture", "design", "fashion", "food", "beverage", "hospitality", "travel", "tourism", "sports", "fitness", "wellness"]
            
            # Look for industry keywords in the query
            for keyword in industry_keywords:
                if keyword in query_lower:
                    industry = keyword
                    break
            
            # If no specific industry found, try to extract from common patterns
            if not industry:
                if "fin-tech" in query_lower or "fintech" in query_lower:
                    industry = "fintech"
                elif "tech" in query_lower and ("industry" in query_lower or "sector" in query_lower):
                    industry = "technology"
            
            return LLMResponse(
                query_type=QueryType.INDUSTRY_CONTACTS,
                api_calls=[{
                    "endpoint": "/api/v1/contacts",
                    "method": "GET",
                    "params": {"industry_filter": True, "industry": industry} if industry else {"industry_filter": True}
                }],
                visualization_type=VisualizationType.CARDS,
                title=f"Contacts in {industry.title()} Industry" if industry else "Industry Contacts",
                summary=f"Showing contacts working in the {industry} industry" if industry else "Showing contacts filtered by industry",
                filters={"industry": industry} if industry else {},
                confidence=0.7,
                reasoning="Fallback rule-based parsing detected industry contacts query"
            )
        
        else:
            return LLMResponse(
                query_type=QueryType.GENERAL,
                api_calls=[{
                    "endpoint": "/api/v1/contacts/stats",
                    "method": "GET",
                    "params": {}
                }],
                visualization_type=VisualizationType.TEXT,
                title="Network Information",
                summary="General information about your network",
                filters={},
                confidence=0.3,
                reasoning="Fallback response - query not recognized"
            )

# Global service instance
llm_service = NetworkQueryLLMService()