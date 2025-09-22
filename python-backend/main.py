from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from contextlib import asynccontextmanager
import os
from dotenv import load_dotenv
import logging

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global variables for database
mongodb_client: AsyncIOMotorClient = None
database = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    global mongodb_client, database
    
    mongodb_uri = os.getenv("MONGODB_URI")
    if not mongodb_uri:
        logger.error("MONGODB_URI environment variable is not set")
        raise ValueError("MONGODB_URI environment variable is required")
    
    try:
        # Configure MongoDB client with SSL settings for macOS compatibility
        mongodb_client = AsyncIOMotorClient(
            mongodb_uri,
            tlsAllowInvalidCertificates=True,  # Allow self-signed certificates
            serverSelectionTimeoutMS=5000,    # Reduce timeout for faster feedback
            connectTimeoutMS=5000,
            socketTimeoutMS=5000
        )
        database = mongodb_client.connectorpro
        
        # Test the connection
        await mongodb_client.admin.command('ping')
        logger.info("Successfully connected to MongoDB Atlas")
        
    except Exception as e:
        logger.error(f"Failed to connect to MongoDB: {e}")
        raise
    
    yield
    
    # Shutdown
    if mongodb_client:
        mongodb_client.close()
        logger.info("MongoDB connection closed")

# Create FastAPI app with lifespan events
app = FastAPI(
    title="ConnectorPro API",
    description="AI-powered LinkedIn networking assistant backend",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:5138").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check endpoint
@app.get("/healthz")
async def health_check():
    """
    Health check endpoint that verifies database connectivity
    """
    try:
        # Test database connection
        if database is None:
            raise HTTPException(status_code=503, detail="Database not initialized")
        
        # Ping the database to ensure connectivity
        await mongodb_client.admin.command('ping')
        
        return {
            "status": "ok",
            "database": "connected",
            "message": "Service is healthy"
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(
            status_code=503, 
            detail=f"Service unhealthy: {str(e)}"
        )

# API v1 router placeholder
@app.get("/api/v1")
async def api_root():
    """
    API v1 root endpoint
    """
    return {
        "message": "ConnectorPro API v1",
        "version": "1.0.0",
        "status": "active"
    }

# Root endpoint
@app.get("/")
async def root():
    """
    Root endpoint
    """
    return {
        "message": "ConnectorPro Backend API",
        "version": "1.0.0",
        "docs": "/docs"
    }

if __name__ == "__main__":
    import uvicorn
    
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=True,
        log_level="info"
    )