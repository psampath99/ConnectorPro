from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
from dotenv import load_dotenv
import logging
import time
from typing import Optional

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="ConnectorPro Ask API",
    description="Simple chat endpoint for ConnectorPro",
    version="1.0.0"
)

# Configure CORS
cors_origins = ["http://localhost:5137", "http://localhost:5140", "http://localhost:5137", "http://localhost:5139", "http://localhost:5141"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Models
class AskRequest(BaseModel):
    query: str
    max_contacts: Optional[int] = 50

class AskResponse(BaseModel):
    success: bool
    query: str
    answer: str
    contacts_used: Optional[int] = None
    processing_time: Optional[float] = None
    error_message: Optional[str] = None

# Health check endpoint
@app.get("/healthz")
async def health_check():
    return {
        "status": "ok",
        "message": "Simple Ask Server is healthy"
    }

# Root endpoint
@app.get("/")
async def root():
    return {
        "message": "ConnectorPro Simple Ask Server",
        "version": "1.0.0",
        "docs": "/docs"
    }

# ASK ENDPOINT
@app.post("/ask", response_model=AskResponse)
async def ask_about_contacts(request: AskRequest):
    """Ask questions about your contacts using OpenAI"""
    start_time = time.time()
    
    try:
        # Mock contacts data for demo
        mock_contacts_data = [
            {
                "name": "John Smith",
                "title": "Software Engineer",
                "company": "Tech Corp",
                "email": "john.smith@techcorp.com",
                "relationship_strength": "medium",
                "notes": "Met at tech conference",
                "tags": ["tech", "software"]
            },
            {
                "name": "Sarah Johnson",
                "title": "Product Manager",
                "company": "Innovation Inc",
                "email": "sarah.johnson@innovation.com",
                "relationship_strength": "strong",
                "notes": "Former colleague",
                "tags": ["product", "management"]
            },
            {
                "name": "Mike Chen",
                "title": "Data Scientist",
                "company": "Analytics Pro",
                "email": "mike.chen@analyticspro.com",
                "relationship_strength": "weak",
                "notes": "LinkedIn connection",
                "tags": ["data", "analytics"]
            },
            {
                "name": "Emily Davis",
                "title": "UX Designer",
                "company": "Design Studio",
                "email": "emily.davis@designstudio.com",
                "relationship_strength": "medium",
                "notes": "Worked on project together",
                "tags": ["design", "ux"]
            },
            {
                "name": "Alex Kumar",
                "title": "Engineering Manager",
                "company": "Stripe",
                "email": "alex.kumar@stripe.com",
                "relationship_strength": "strong",
                "notes": "Former manager",
                "tags": ["engineering", "management", "fintech"]
            }
        ]
        
        # Build the context for OpenAI
        contacts_context = f"Here is the user's contact database with {len(mock_contacts_data)} contacts:\n\n"
        for i, contact in enumerate(mock_contacts_data, 1):
            contacts_context += f"{i}. {contact}\n"
        
        # Create the prompt for OpenAI
        system_prompt = """You are an AI assistant that helps users analyze their professional network and contacts.
You have access to their contact database and can answer questions about their connections, companies, relationships, and networking opportunities.

Be helpful, accurate, and provide specific insights based on the contact data provided. If you don't have enough information to answer a question, say so clearly.

When mentioning specific contacts, use their names. When discussing companies or roles, be specific about the data you're referencing."""

        user_prompt = f"""Based on my contact database, please answer this question: {request.query}

{contacts_context}

Please provide a helpful and specific answer based on the contact data above."""

        # Call OpenAI API
        openai_api_key = os.getenv("OPENAI_API_KEY")
        if not openai_api_key:
            return AskResponse(
                success=False,
                query=request.query,
                answer="OpenAI API key is not configured. Please set the OPENAI_API_KEY environment variable.",
                error_message="OpenAI API key not found"
            )

        import aiohttp
        import ssl
        
        # Create SSL context that handles certificate issues
        ssl_context = ssl.create_default_context()
        ssl_context.check_hostname = False
        ssl_context.verify_mode = ssl.CERT_NONE
        
        connector = aiohttp.TCPConnector(ssl=ssl_context)
        
        headers = {
            "Authorization": f"Bearer {openai_api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            "temperature": 0.1,
            "max_tokens": 1000
        }
        
        async with aiohttp.ClientSession(connector=connector) as session:
            async with session.post("https://api.openai.com/v1/chat/completions", headers=headers, json=payload) as response:
                if response.status != 200:
                    error_text = await response.text()
                    logger.error(f"OpenAI API error: {response.status} - {error_text}")
                    return AskResponse(
                        success=False,
                        query=request.query,
                        answer=f"Error calling OpenAI API: {response.status}",
                        error_message=error_text
                    )
                
                result = await response.json()
                answer = result["choices"][0]["message"]["content"]
        
        processing_time = time.time() - start_time
        
        return AskResponse(
            success=True,
            query=request.query,
            answer=answer,
            contacts_used=len(mock_contacts_data),
            processing_time=processing_time
        )
        
    except Exception as e:
        processing_time = time.time() - start_time
        logger.error(f"Error in ask endpoint: {e}")
        return AskResponse(
            success=False,
            query=request.query,
            answer=f"An error occurred while processing your question: {str(e)}",
            contacts_used=0,
            processing_time=processing_time,
            error_message=str(e)
        )

if __name__ == "__main__":
    import uvicorn
    
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(
        "simple_ask_server:app",
        host="0.0.0.0",
        port=port,
        reload=True,
        log_level="info"
    )