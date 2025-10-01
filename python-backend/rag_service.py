"""
RAG (Retrieval-Augmented Generation) Service for processing network queries.
This service bridges the LLM service with actual data retrieval and response generation.
"""

import logging
import asyncio
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime
import json

from database import DatabaseService
from llm_service import NetworkQueryLLMService, LLMQuery, NetworkDataContext, QueryType, VisualizationType
from models import NetworkQueryRequest, NetworkQueryResponse, Contact

logger = logging.getLogger(__name__)

class NetworkDataRetriever:
    """Handles data retrieval from the database based on API calls"""
    
    def __init__(self, db_service: DatabaseService):
        self.db_service = db_service
    
    async def execute_api_call(self, api_call: Dict[str, Any], user_id: str) -> Dict[str, Any]:
        """Execute a single API call and return the data"""
        endpoint = api_call.get("endpoint", "")
        method = api_call.get("method", "GET")
        params = api_call.get("params", {})
        
        logger.info(f"Executing API call: {method} {endpoint} with params: {params}")
        
        try:
            if endpoint == "/api/v1/contacts/grouped-by-company":
                return await self._get_contacts_grouped_by_company(user_id, params)
            elif endpoint == "/api/v1/contacts/stats":
                return await self._get_contact_stats(user_id, params)
            elif endpoint == "/api/v1/target-companies":
                return await self._get_target_companies(user_id, params)
            elif endpoint == "/api/v1/contacts/target-companies":
                return await self._get_contacts_at_target_companies(user_id, params)
            elif endpoint == "/api/v1/contacts":
                return await self._get_contacts(user_id, params)
            else:
                logger.warning(f"Unknown endpoint: {endpoint}")
                return {"error": f"Unknown endpoint: {endpoint}"}
                
        except Exception as e:
            logger.error(f"Error executing API call {endpoint}: {e}")
            return {"error": str(e)}
    
    async def _get_contacts_grouped_by_company(self, user_id: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """Get contacts grouped by company"""
        require_title = params.get("require_title", False)
        target_companies_only = params.get("target_companies_only", False)
        
        # Build MongoDB query
        query = {"user_id": user_id}
        
        if require_title:
            query["title"] = {"$ne": None, "$ne": ""}
        
        if target_companies_only:
            # Get target companies first
            target_companies = await self._get_target_company_names(user_id)
            if target_companies:
                query["company"] = {"$in": target_companies}
        
        # Add company filter
        query["company"] = {"$ne": None, "$ne": ""}
        
        # Use MongoDB aggregation to group by company
        pipeline = [
            {"$match": query},
            {
                "$group": {
                    "_id": "$company",
                    "contact_count": {"$sum": 1},
                    "contacts": {
                        "$push": {
                            "name": "$name",
                            "title": "$title",
                            "email": "$email",
                            "linkedinUrl": "$linkedinUrl"
                        }
                    }
                }
            },
            {"$sort": {"contact_count": -1}}
        ]
        
        companies = {}
        total_contacts = 0
        
        try:
            cursor = self.db_service.contacts_collection.aggregate(pipeline)
            async for doc in cursor:
                company_name = doc["_id"]
                contact_count = doc["contact_count"]
                contacts = doc["contacts"]
                
                companies[company_name] = {
                    "contact_count": contact_count,
                    "contacts": contacts
                }
                total_contacts += contact_count
        except Exception as e:
            logger.error(f"Error in _get_contacts_grouped_by_company: {e}")
            return {"success": False, "error": str(e)}
        
        return {
            "success": True,
            "companies": companies,
            "companies_with_contacts": len(companies),
            "total_contacts": total_contacts
        }
    
    async def _get_contact_stats(self, user_id: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """Get contact statistics"""
        try:
            # Use MongoDB aggregation for statistics
            pipeline = [
                {"$match": {"user_id": user_id}},
                {
                    "$group": {
                        "_id": None,
                        "total_contacts": {"$sum": 1},
                        "unique_companies": {"$addToSet": "$company"},
                        "contacts_with_email": {
                            "$sum": {
                                "$cond": [
                                    {"$and": [{"$ne": ["$email", None]}, {"$ne": ["$email", ""]}]},
                                    1,
                                    0
                                ]
                            }
                        },
                        "contacts_with_phone": {
                            "$sum": {
                                "$cond": [
                                    {"$and": [{"$ne": ["$phone", None]}, {"$ne": ["$phone", ""]}]},
                                    1,
                                    0
                                ]
                            }
                        },
                        "contacts_with_linkedin": {
                            "$sum": {
                                "$cond": [
                                    {"$and": [{"$ne": ["$linkedinUrl", None]}, {"$ne": ["$linkedinUrl", ""]}]},
                                    1,
                                    0
                                ]
                            }
                        }
                    }
                }
            ]
            
            cursor = self.db_service.contacts_collection.aggregate(pipeline)
            result = await cursor.to_list(length=1)
            
            if result:
                stats = result[0]
                return {
                    "totalActiveContacts": stats.get("total_contacts", 0),
                    "totalCompanies": len([c for c in stats.get("unique_companies", []) if c]),
                    "contactsWithEmail": stats.get("contacts_with_email", 0),
                    "contactsWithPhone": stats.get("contacts_with_phone", 0),
                    "contactsWithLinkedIn": stats.get("contacts_with_linkedin", 0)
                }
            else:
                return {
                    "totalActiveContacts": 0,
                    "totalCompanies": 0,
                    "contactsWithEmail": 0,
                    "contactsWithPhone": 0,
                    "contactsWithLinkedIn": 0
                }
        except Exception as e:
            logger.error(f"Error in _get_contact_stats: {e}")
            return {
                "totalActiveContacts": 0,
                "totalCompanies": 0,
                "contactsWithEmail": 0,
                "contactsWithPhone": 0,
                "contactsWithLinkedIn": 0
            }
    
    async def _get_target_companies(self, user_id: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """Get user's target companies"""
        try:
            companies = await self.db_service.get_target_companies_by_user_id(user_id)
            
            company_list = []
            for company in companies:
                company_list.append({
                    "company_name": company.company_name,
                    "company_domains": company.company_domains or [],
                    "created_at": company.created_at.isoformat() if company.created_at else None
                })
            
            return {
                "success": True,
                "companies": company_list
            }
        except Exception as e:
            logger.error(f"Error in _get_target_companies: {e}")
            return {
                "success": False,
                "companies": [],
                "error": str(e)
            }
    
    async def _get_target_company_names(self, user_id: str) -> List[str]:
        """Get list of target company names"""
        try:
            companies = await self.db_service.get_target_companies_by_user_id(user_id)
            return [company.company_name for company in companies]
        except Exception as e:
            logger.error(f"Error in _get_target_company_names: {e}")
            return []
    
    async def _get_contacts_at_target_companies(self, user_id: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """Get contacts at target companies"""
        try:
            target_companies = await self._get_target_company_names(user_id)
            
            if not target_companies:
                return {"success": True, "contacts": [], "companies": []}
            
            # Query contacts at target companies
            query = {
                "user_id": user_id,
                "company": {"$in": target_companies}
            }
            
            cursor = self.db_service.contacts_collection.find(query).sort([("company", 1), ("name", 1)])
            contacts = []
            
            async for doc in cursor:
                contacts.append({
                    "name": doc.get("name", ""),
                    "title": doc.get("title", ""),
                    "company": doc.get("company", ""),
                    "email": doc.get("email", ""),
                    "linkedinUrl": doc.get("linkedinUrl", ""),
                    "phone": doc.get("phone", "")
                })
            
            return {
                "success": True,
                "contacts": contacts,
                "companies": target_companies
            }
        except Exception as e:
            logger.error(f"Error in _get_contacts_at_target_companies: {e}")
            return {
                "success": False,
                "contacts": [],
                "companies": [],
                "error": str(e)
            }
    
    async def _get_contacts(self, user_id: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """Get contacts with filtering"""
        try:
            # Build MongoDB query
            query = {"user_id": user_id}
            
            # Apply filters
            if params.get("company"):
                query["company"] = {"$regex": params["company"], "$options": "i"}
            
            if params.get("title"):
                query["title"] = {"$regex": params["title"], "$options": "i"}
            
            # Industry filtering - infer from company names and titles
            if params.get("industry_filter") and params.get("industry"):
                industry_query = self._build_industry_query(params["industry"])
                if industry_query:
                    query["$or"] = industry_query
            
            # Build cursor with sorting
            cursor = self.db_service.contacts_collection.find(query).sort("name", 1)
            
            # Apply limit if specified
            if params.get("limit"):
                cursor = cursor.limit(params["limit"])
            
            contacts = []
            async for doc in cursor:
                contacts.append({
                    "name": doc.get("name", ""),
                    "title": doc.get("title", ""),
                    "company": doc.get("company", ""),
                    "email": doc.get("email", ""),
                    "linkedinUrl": doc.get("linkedinUrl", ""),
                    "phone": doc.get("phone", "")
                })
            
            return {
                "success": True,
                "contacts": contacts,
                "total": len(contacts)
            }
        except Exception as e:
            logger.error(f"Error in _get_contacts: {e}")
            return {
                "success": False,
                "contacts": [],
                "total": 0,
                "error": str(e)
            }
    
    def _build_industry_query(self, industry: str) -> List[Dict[str, Any]]:
        """Build MongoDB query to filter contacts by industry based on company names and titles"""
        industry_lower = industry.lower()
        
        # Define industry-specific keywords for companies and titles
        industry_mappings = {
            "fintech": {
                "companies": ["fintech", "financial", "bank", "credit", "payment", "lending", "investment", "trading", "wealth", "insurance", "blockchain", "crypto", "stripe", "square", "paypal", "robinhood", "coinbase", "plaid", "chime", "affirm", "klarna"],
                "titles": ["financial", "fintech", "banking", "investment", "trading", "wealth", "credit", "payment", "lending", "risk", "compliance", "treasury", "portfolio"]
            },
            "fin-tech": {
                "companies": ["fintech", "financial", "bank", "credit", "payment", "lending", "investment", "trading", "wealth", "insurance", "blockchain", "crypto", "stripe", "square", "paypal", "robinhood", "coinbase", "plaid", "chime", "affirm", "klarna"],
                "titles": ["financial", "fintech", "banking", "investment", "trading", "wealth", "credit", "payment", "lending", "risk", "compliance", "treasury", "portfolio"]
            },
            "technology": {
                "companies": ["tech", "software", "saas", "cloud", "ai", "data", "analytics", "mobile", "web", "platform", "microsoft", "google", "amazon", "apple", "meta", "netflix", "uber", "airbnb", "salesforce", "oracle", "adobe", "zoom", "slack"],
                "titles": ["engineer", "developer", "architect", "technical", "software", "data", "ai", "machine learning", "cloud", "devops", "product manager", "cto", "vp engineering"]
            },
            "tech": {
                "companies": ["tech", "software", "saas", "cloud", "ai", "data", "analytics", "mobile", "web", "platform", "microsoft", "google", "amazon", "apple", "meta", "netflix", "uber", "airbnb", "salesforce", "oracle", "adobe", "zoom", "slack"],
                "titles": ["engineer", "developer", "architect", "technical", "software", "data", "ai", "machine learning", "cloud", "devops", "product manager", "cto", "vp engineering"]
            },
            "healthcare": {
                "companies": ["health", "medical", "hospital", "pharma", "biotech", "clinic", "care", "wellness", "teladoc", "moderna", "pfizer", "johnson", "abbott", "medtronic", "unitedhealth"],
                "titles": ["medical", "health", "clinical", "physician", "doctor", "nurse", "pharma", "biotech", "healthcare", "wellness", "patient"]
            },
            "consulting": {
                "companies": ["consulting", "advisory", "mckinsey", "bain", "bcg", "deloitte", "pwc", "kpmg", "ey", "accenture", "strategy"],
                "titles": ["consultant", "advisor", "strategy", "management", "business analyst", "engagement", "partner", "principal", "associate"]
            }
        }
        
        # Get keywords for the specified industry
        mapping = industry_mappings.get(industry_lower, {})
        if not mapping:
            # Fallback: use the industry name itself
            mapping = {
                "companies": [industry_lower],
                "titles": [industry_lower]
            }
        
        # Build OR query for company names and titles
        or_conditions = []
        
        # Add company name conditions
        for keyword in mapping.get("companies", []):
            or_conditions.append({"company": {"$regex": keyword, "$options": "i"}})
        
        # Add title conditions
        for keyword in mapping.get("titles", []):
            or_conditions.append({"title": {"$regex": keyword, "$options": "i"}})
        
        return or_conditions

class NetworkRAGService:
    """Main RAG service that combines LLM processing with data retrieval"""
    
    def __init__(self, db_service: DatabaseService = None):
        self.llm_service = NetworkQueryLLMService()
        self.db_service = db_service
        if db_service:
            self.data_retriever = NetworkDataRetriever(db_service)
        else:
            self.data_retriever = None
    
    async def get_network_context(self, user_id: str) -> NetworkDataContext:
        """Get context about the user's network data"""
        try:
            # Get basic stats
            stats = await self.data_retriever._get_contact_stats(user_id, {})
            
            # Get target companies
            target_companies_data = await self.data_retriever._get_target_companies(user_id, {})
            target_companies = [tc["company_name"] for tc in target_companies_data.get("companies", [])]
            
            return NetworkDataContext(
                total_contacts=stats.get("totalActiveContacts", 0),
                total_companies=stats.get("totalCompanies", 0),
                target_companies=target_companies,
                available_apis=[
                    "/api/v1/contacts/grouped-by-company",
                    "/api/v1/contacts/stats",
                    "/api/v1/target-companies",
                    "/api/v1/contacts/target-companies",
                    "/api/v1/contacts"
                ]
            )
        except Exception as e:
            logger.error(f"Error getting network context: {e}")
            return NetworkDataContext()
    
    async def process_network_query(self, request: NetworkQueryRequest, user_id: str) -> NetworkQueryResponse:
        """Process a network query using RAG"""
        start_time = datetime.now()
        
        try:
            # Step 1: Get network context
            context = await self.get_network_context(user_id)
            
            # Step 2: Use LLM to understand the query
            llm_query = LLMQuery(
                query=request.query,
                user_id=user_id,
                conversation_history=request.conversation_history or []
            )
            
            llm_response = await self.llm_service.process_query(llm_query, context)
            
            # Step 3: Execute the API calls to retrieve data
            retrieved_data = []
            for api_call in llm_response.api_calls:
                data = await self.data_retriever.execute_api_call(api_call, user_id)
                retrieved_data.append(data)
            
            # Step 4: Process and format the data based on query type and filters
            processed_data = await self._process_retrieved_data(
                retrieved_data, 
                llm_response.query_type, 
                llm_response.filters,
                llm_response.visualization_type
            )
            
            # Step 5: Generate final response
            processing_time = (datetime.now() - start_time).total_seconds()
            
            return NetworkQueryResponse(
                success=True,
                query_type=llm_response.query_type.value,
                title=llm_response.title,
                summary=llm_response.summary,
                visualization_type=llm_response.visualization_type.value,
                data=processed_data,
                confidence=llm_response.confidence,
                reasoning=llm_response.reasoning,
                provider_used=self.llm_service.default_provider.value if self.llm_service.default_provider else "fallback",
                processing_time=processing_time
            )
            
        except Exception as e:
            logger.error(f"Error processing network query: {e}")
            processing_time = (datetime.now() - start_time).total_seconds()
            
            return NetworkQueryResponse(
                success=False,
                query_type="error",
                title="Query Processing Error",
                summary=f"Failed to process your query: {str(e)}",
                visualization_type="text",
                data=None,
                confidence=0.0,
                error_message=str(e),
                processing_time=processing_time
            )
    
    async def _process_retrieved_data(
        self, 
        retrieved_data: List[Dict[str, Any]], 
        query_type: QueryType,
        filters: Dict[str, Any],
        visualization_type: VisualizationType
    ) -> Any:
        """Process the retrieved data based on query type and filters"""
        
        if not retrieved_data or not retrieved_data[0]:
            return []
        
        data = retrieved_data[0]  # Use first data source for now
        
        if query_type == QueryType.COMPANY_RANKING:
            return self._process_company_ranking(data, filters)
        elif query_type == QueryType.CONTACT_LIST:
            return self._process_contact_list(data, filters)
        elif query_type == QueryType.COMPANY_CONTACTS:
            return self._process_company_contacts(data, filters)
        elif query_type == QueryType.INDUSTRY_CONTACTS:
            return self._process_industry_contacts(data, filters)
        elif query_type == QueryType.ANALYTICS:
            return self._process_analytics(data, filters)
        else:
            return data
    
    def _process_company_ranking(self, data: Dict[str, Any], filters: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Process company ranking data"""
        if not data.get("success") or not data.get("companies"):
            return []
        
        companies = data["companies"]
        
        # Convert to list format
        company_list = []
        for company_name, company_data in companies.items():
            company_list.append({
                "Company": company_name,
                "Contact Count": company_data["contact_count"]
            })
        
        # Sort by contact count
        company_list.sort(key=lambda x: x["Contact Count"], reverse=True)
        
        # Apply limit filter
        limit = filters.get("limit", 10)
        return company_list[:limit]
    
    def _process_contact_list(self, data: Dict[str, Any], filters: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Process contact list data"""
        if not data.get("success") or not data.get("contacts"):
            return []
        
        contacts = data["contacts"]
        
        # Convert to display format
        contact_list = []
        for contact in contacts:
            contact_list.append({
                "Name": contact.get("name", ""),
                "Title": contact.get("title", ""),
                "Company": contact.get("company", ""),
                "Email": contact.get("email", ""),
                "LinkedIn": contact.get("linkedinUrl", "")
            })
        
        # Apply limit filter
        limit = filters.get("limit", 50)
        return contact_list[:limit]
    
    def _process_company_contacts(self, data: Dict[str, Any], filters: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Process company contacts data"""
        if not data.get("success"):
            return []
        
        if "companies" in data:
            # Grouped by company format
            companies = data["companies"]
            company_filter = filters.get("company", "")
            if company_filter:
                company_filter = company_filter.lower()
            
            result = []
            for company_name, company_data in companies.items():
                if company_filter and company_name and company_filter not in company_name.lower():
                    continue
                
                for contact in company_data.get("contacts", []):
                    result.append({
                        "Name": contact.get("name", ""),
                        "Title": contact.get("title", ""),
                        "Company": company_name,
                        "Email": contact.get("email", ""),
                        "LinkedIn": contact.get("linkedinUrl", "")
                    })
            
            return result
        
        elif "contacts" in data:
            # Direct contacts format
            return self._process_contact_list(data, filters)
        
        return []
    
    def _process_industry_contacts(self, data: Dict[str, Any], filters: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Process industry contacts data"""
        if not data.get("success") or not data.get("contacts"):
            return []
        
        contacts = data["contacts"]
        
        # Convert to display format
        contact_list = []
        for contact in contacts:
            contact_list.append({
                "Name": contact.get("name", ""),
                "Title": contact.get("title", ""),
                "Company": contact.get("company", ""),
                "Email": contact.get("email", ""),
                "LinkedIn": contact.get("linkedinUrl", "")
            })
        
        # Apply limit filter
        limit = filters.get("limit", 50)
        return contact_list[:limit]
    
    def _process_analytics(self, data: Dict[str, Any], filters: Dict[str, Any]) -> Dict[str, Any]:
        """Process analytics data"""
        return data

# Global RAG service instance - will be initialized in main.py
rag_service = None