# Load environment variables FIRST before any imports that depend on them
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

from fastapi import FastAPI, HTTPException, Depends, status, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from typing import Optional
import logging
from contextlib import asynccontextmanager
from datetime import datetime

# Import our services and models
from database import DatabaseService
from enhanced_auth import EnhancedAuthService, enhanced_auth_service, get_enhanced_auth_service, get_current_user_enhanced, get_current_user_optional, auth_rate_limit
from user_models import UserLogin, UserCreate, TokenResponse, UserResponse, User
from gmail_service import GmailService
from calendar_service import CalendarService
from csv_service import CSVService
from llm_service import NetworkQueryLLMService, llm_service

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global services
db_service = None
gmail_service = None
calendar_service = None
csv_service = None
llm_service = None

# Simple in-memory storage for demo purposes (simulating localStorage)
localStorage_simulation = {
    # Add Gmail connection for demo user to mirror Calendar connection
    "gmail_connected_demo-user-sampath": {
        "email_address": "sampath.prema@gmail.com",
        "last_connected": "2025-09-30T07:33:22.610039",
        "scopes": [
            "https://www.googleapis.com/auth/gmail.readonly",
            "https://www.googleapis.com/auth/gmail.send",
            "https://www.googleapis.com/auth/userinfo.email",
            "openid"
        ],
        "status": "connected"
    },
    # Calendar connection already exists from previous OAuth
    "calendar_connected_demo-user-sampath": {
        "email_address": "sampath.prema@gmail.com",
        "last_connected": "2025-09-30T07:33:22.610039",
        "scopes": [
            "https://www.googleapis.com/auth/calendar",
            "https://www.googleapis.com/auth/calendar.events",
            "https://www.googleapis.com/auth/userinfo.email",
            "openid"
        ],
        "status": "connected"
    }
}

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    global db_service, enhanced_auth_service, gmail_service, calendar_service, csv_service, llm_service
    
    try:
        # Initialize database connection
        logger.info("🚀 Initializing database connection...")
        import os
        from motor.motor_asyncio import AsyncIOMotorClient
        
        mongodb_uri = os.getenv("MONGODB_URI")
        if not mongodb_uri:
            raise ValueError("MONGODB_URI environment variable not set")
        
        logger.info(f"🔍 [DEBUG] MongoDB URI configured: {mongodb_uri[:50]}...")
        logger.info("🔍 [DEBUG] Attempting to create MongoDB client...")
        
        # Add SSL configuration to bypass certificate verification for development
        client = AsyncIOMotorClient(mongodb_uri, tlsAllowInvalidCertificates=True)
        database = client.connectorpro
        
        logger.info("🔍 [DEBUG] MongoDB client created, testing connection...")
        # Test connection
        await client.admin.command('ping')
        logger.info("✅ Database connection established successfully")
        
        # Initialize database service
        logger.info("🚀 Initializing database service...")
        db_service = DatabaseService(database)
        logger.info("✅ Database service initialized")
        
        # Initialize enhanced auth service
        logger.info("🔐 Initializing enhanced auth service...")
        from enhanced_auth import enhanced_auth_service as global_auth_service
        global enhanced_auth_service
        enhanced_auth_service = EnhancedAuthService(db_service)
        # Set the global instance
        import enhanced_auth
        enhanced_auth.enhanced_auth_service = enhanced_auth_service
        logger.info("✅ Enhanced auth service initialized")
        
        # Initialize other services
        logger.info("📧 Initializing Gmail service...")
        gmail_service = GmailService()
        logger.info("✅ Gmail service initialized")
        
        logger.info("📅 Initializing Calendar service...")
        calendar_service = CalendarService()
        logger.info("✅ Calendar service initialized")
        
        logger.info("📊 Initializing CSV service...")
        csv_service = CSVService()
        logger.info("✅ CSV service initialized")
        
        logger.info("🤖 Initializing LLM service...")
        # LLM service is already initialized as a global instance
        logger.info("✅ LLM service initialized")
        
        logger.info("🎉 All services initialized successfully!")
        
    except Exception as e:
        logger.error(f"❌ Failed to initialize services: {e}")
        raise
    
    yield
    
    # Cleanup
    try:
        if db_service:
            await db_service.close()
            logger.info("🔌 Database connection closed")
    except Exception as e:
        logger.error(f"❌ Error during cleanup: {e}")

# Create FastAPI app with lifespan
app = FastAPI(
    title="ConnectorPro API",
    description="AI-powered LinkedIn networking assistant",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
# Add additional origins for development
cors_origins.extend([
    "http://localhost:5174",
    "http://localhost:5137",  # Add port 5137 for frontend
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "http://127.0.0.1:5137"   # Add port 5137 for frontend
])

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Health check endpoints
@app.get("/")
async def root():
    """Root endpoint"""
    return {"message": "ConnectorPro API is running", "status": "healthy"}

@app.get("/healthz")
async def health_check():
    """Health check with database connectivity test"""
    try:
        if db_service:
            # Test database connection
            await db_service.health_check()
            return {
                "status": "healthy",
                "database": "connected",
                "timestamp": "2025-01-01T00:00:00Z"
            }
        else:
            return {
                "status": "unhealthy",
                "database": "not_initialized",
                "timestamp": "2025-01-01T00:00:00Z"
            }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return JSONResponse(
            status_code=503,
            content={
                "status": "unhealthy",
                "database": "disconnected",
                "error": str(e),
                "timestamp": "2025-01-01T00:00:00Z"
            }
        )

@app.get("/api/v1")
async def api_root():
    """API v1 root endpoint"""
    return {"message": "ConnectorPro API v1", "version": "1.0.0"}

# Authentication endpoints
@app.post("/api/v1/auth/login", response_model=TokenResponse)
async def login(
    user_login: UserLogin,
    auth_service: EnhancedAuthService = Depends(get_enhanced_auth_service)
):
    """User login endpoint"""
    try:
        logger.info(f"🔐 Login attempt for user: {user_login.email}")
        
        # Authenticate user
        user, is_authenticated = await auth_service.authenticate_user(
            user_login.email, 
            user_login.password
        )
        
        if not is_authenticated:
            logger.warning(f"❌ Failed login attempt for user: {user_login.email}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        
        # Generate tokens
        tokens = await auth_service.create_tokens(user)
        logger.info(f"✅ Successful login for user: {user_login.email}")
        
        return tokens
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Login error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login service error"
        )

@app.post("/api/v1/auth/register", response_model=UserResponse)
async def register(
    user_create: UserCreate,
    auth_service: EnhancedAuthService = Depends(get_enhanced_auth_service)
):
    """User registration endpoint"""
    try:
        logger.info(f"📝 Registration attempt for user: {user_create.email}")
        
        # Register user
        user_response = await auth_service.register_user(user_create)
        logger.info(f"✅ Successful registration for user: {user_create.email}")
        
        return user_response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Registration error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration service error"
        )

@app.post("/api/v1/auth/refresh", response_model=TokenResponse)
async def refresh_token(
    refresh_token: str,
    auth_service: EnhancedAuthService = Depends(get_enhanced_auth_service)
):
    """Refresh access token"""
    try:
        logger.info("🔄 Token refresh attempt")
        
        # Refresh tokens
        tokens = await auth_service.refresh_tokens(refresh_token)
        logger.info("✅ Successful token refresh")
        
        return tokens
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Token refresh error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Token refresh service error"
        )

@app.get("/api/v1/auth/me")
async def get_current_user(
    current_user: User = Depends(get_current_user_enhanced)
):
    """Get current authenticated user information"""
    try:
        logger.info("👤 Get current user request")
        logger.info(f"✅ Current user retrieved: {current_user.email}")
        
        return {
            "user": {
                "id": current_user.id,
                "email": current_user.email,
                "name": current_user.name,
                "role": current_user.role,
                "status": current_user.status,
                "email_verified": current_user.email_verified,
                "phone": current_user.phone,
                "profile_picture": current_user.profile_picture,
                "last_login": current_user.last_login,
                "created_at": current_user.created_at,
                "updated_at": current_user.updated_at
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Get current user error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get user information"
        )

# Gmail endpoints
@app.get("/api/v1/gmail/auth-url")
async def get_gmail_auth_url(
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """Get Gmail OAuth authorization URL"""
    try:
        # Handle demo users or unauthenticated requests
        if not current_user:
            logger.info("📧 Gmail auth URL request for demo/unauthenticated user")
            user_id = "demo-user-sampath"
            user_email = "sampath.prema@gmail.com"
        else:
            logger.info(f"📧 Gmail auth URL request for user: {current_user.email}")
            user_id = current_user.id
            user_email = current_user.email
        
        # Get authorization URL from Gmail service
        auth_url = gmail_service.get_authorization_url(user_id)
        logger.info(f"✅ Gmail auth URL generated for user: {user_email}")
        
        return {
            "auth_url": auth_url,
            "success": True
        }
        
    except Exception as e:
        logger.error(f"❌ Gmail auth URL error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get Gmail authorization URL: {str(e)}"
        )

@app.get("/api/v1/gmail/status")
async def get_gmail_status(
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """Get Gmail connection status"""
    try:
        # Handle demo users or unauthenticated requests
        if not current_user:
            logger.info("📧 Gmail status request for demo/unauthenticated user")
            user_id = "demo-user-sampath"
            user_email = "sampath.prema@gmail.com"
        else:
            logger.info(f"📧 Gmail status request for user: {current_user.email}")
            user_id = current_user.id
            user_email = current_user.email
        
        # Check if user has a stored Gmail connection
        # For demo purposes, simulate a connected state if user recently connected
        gmail_connected_key = f"gmail_connected_{user_id}"
        gmail_connection_data = localStorage_simulation.get(gmail_connected_key)
        
        if gmail_connection_data:
            return {
                "status": "connected",
                "email_address": gmail_connection_data.get("email_address", user_email),
                "last_connected": gmail_connection_data.get("last_connected", datetime.now().isoformat()),
                "scopes": gmail_connection_data.get("scopes", [
                    "https://www.googleapis.com/auth/gmail.readonly",
                    "https://www.googleapis.com/auth/gmail.send",
                    "https://www.googleapis.com/auth/userinfo.email",
                    "openid"
                ])
            }
        else:
            return {
                "status": "not_connected",
                "email_address": None,
                "last_connected": None,
                "scopes": []
            }
        
    except Exception as e:
        logger.error(f"❌ Gmail status error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get Gmail status: {str(e)}"
        )

@app.delete("/api/v1/gmail/disconnect")
async def disconnect_gmail(
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """Disconnect Gmail account"""
    try:
        # Handle demo users or unauthenticated requests
        if not current_user:
            logger.info("📧 Gmail disconnect request for demo/unauthenticated user")
            user_id = "demo-user-sampath"
            user_email = "sampath.prema@gmail.com"
        else:
            logger.info(f"📧 Gmail disconnect request for user: {current_user.email}")
            user_id = current_user.id
            user_email = current_user.email
        
        # Remove Gmail connection data
        gmail_connected_key = f"gmail_connected_{user_id}"
        if gmail_connected_key in localStorage_simulation:
            del localStorage_simulation[gmail_connected_key]
        
        logger.info(f"✅ Gmail disconnected for user: {user_email}")
        
        return {
            "success": True,
            "message": "Gmail account disconnected successfully"
        }
        
    except Exception as e:
        logger.error(f"❌ Gmail disconnect error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to disconnect Gmail: {str(e)}"
        )

@app.get("/api/v1/calendar/status")
async def get_calendar_status(
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """Get Calendar connection status"""
    try:
        # Handle demo users or unauthenticated requests
        if not current_user:
            logger.info("📅 Calendar status request for demo/unauthenticated user")
            user_id = "demo-user-sampath"
            user_email = "sampath.prema@gmail.com"
        else:
            logger.info(f"📅 Calendar status request for user: {current_user.email}")
            user_id = current_user.id
            user_email = current_user.email
        
        # Check if user has a stored Calendar connection
        calendar_connected_key = f"calendar_connected_{user_id}"
        calendar_connection_data = localStorage_simulation.get(calendar_connected_key)
        
        if calendar_connection_data:
            return {
                "status": "connected",
                "email_address": calendar_connection_data.get("email_address", user_email),
                "last_connected": calendar_connection_data.get("last_connected", datetime.now().isoformat()),
                "scopes": calendar_connection_data.get("scopes", [
                    "https://www.googleapis.com/auth/calendar",
                    "https://www.googleapis.com/auth/calendar.events",
                    "https://www.googleapis.com/auth/userinfo.email",
                    "openid"
                ])
            }
        else:
            return {
                "status": "not_connected",
                "email_address": None,
                "last_connected": None,
                "scopes": []
            }
        
    except Exception as e:
        logger.error(f"❌ Calendar status error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get Calendar status: {str(e)}"
        )

@app.delete("/api/v1/calendar/disconnect")
async def disconnect_calendar(
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """Disconnect Calendar account"""
    try:
        # Handle demo users or unauthenticated requests
        if not current_user:
            logger.info("📅 Calendar disconnect request for demo/unauthenticated user")
            user_id = "demo-user-sampath"
            user_email = "sampath.prema@gmail.com"
        else:
            logger.info(f"📅 Calendar disconnect request for user: {current_user.email}")
            user_id = current_user.id
            user_email = current_user.email
        
        # Remove Calendar connection data
        calendar_connected_key = f"calendar_connected_{user_id}"
        if calendar_connected_key in localStorage_simulation:
            del localStorage_simulation[calendar_connected_key]
        
        logger.info(f"✅ Calendar disconnected for user: {user_email}")
        
        return {
            "success": True,
            "message": "Calendar account disconnected successfully"
        }
        
    except Exception as e:
        logger.error(f"❌ Calendar disconnect error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to disconnect Calendar: {str(e)}"
        )

@app.get("/api/v1/calendar/auth-url")
async def get_calendar_auth_url(
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """Get Calendar OAuth authorization URL"""
    try:
        # Handle demo users or unauthenticated requests
        if not current_user:
            logger.info("📅 Calendar auth URL request for demo/unauthenticated user")
            user_id = "demo-user-sampath"
            user_email = "sampath.prema@gmail.com"
        else:
            logger.info(f"📅 Calendar auth URL request for user: {current_user.email}")
            user_id = current_user.id
            user_email = current_user.email
        
        # Get authorization URL from Calendar service
        auth_url = calendar_service.get_authorization_url(user_id)
        logger.info(f"✅ Calendar auth URL generated for user: {user_email}")
        
        return {
            "auth_url": auth_url,
            "success": True
        }
        
    except Exception as e:
        logger.error(f"❌ Calendar auth URL error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get Calendar authorization URL: {str(e)}"
        )

@app.get("/api/v1/calendar/callback")
async def calendar_oauth_callback(
    code: str,
    state: str,
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """Handle Calendar OAuth callback"""
    try:
        logger.info(f"📅 Calendar OAuth callback received - state: {state}, code: {code[:20]}...")
        
        # Handle demo users or unauthenticated requests
        if not current_user:
            logger.info("📅 Calendar OAuth callback for demo/unauthenticated user")
            user_id = state  # Use state parameter as user_id
            user_email = "sampath.prema@gmail.com"
        else:
            logger.info(f"📅 Calendar OAuth callback for user: {current_user.email}")
            user_id = current_user.id
            user_email = current_user.email
        
        # Create auth request object
        from models import GmailAuthRequest  # Reuse the same model for Calendar
        auth_request = GmailAuthRequest(
            authorization_code=code,
            redirect_uri="http://localhost:8000/api/v1/calendar/callback"
        )
        
        # Exchange code for tokens (using calendar service)
        connection = await calendar_service.exchange_code_for_tokens(auth_request, user_id)
        
        # Store connection data in localStorage simulation
        calendar_connected_key = f"calendar_connected_{user_id}"
        localStorage_simulation[calendar_connected_key] = {
            "email_address": connection.email_address if hasattr(connection, 'email_address') else user_email,
            "last_connected": datetime.now().isoformat(),
            "scopes": connection.scopes if hasattr(connection, 'scopes') else [
                "https://www.googleapis.com/auth/calendar",
                "https://www.googleapis.com/auth/calendar.events",
                "https://www.googleapis.com/auth/userinfo.email",
                "openid"
            ],
            "status": "connected"
        }
        
        logger.info(f"✅ Calendar OAuth completed for user: {user_email}")
        
        # Redirect to frontend with success message
        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "message": "Calendar connection established successfully",
                "email": connection.email_address if hasattr(connection, 'email_address') else user_email,
                "redirect_url": "http://localhost:5137/settings"
            }
        )
        
    except Exception as e:
        logger.error(f"❌ Calendar OAuth callback error: {e}")
        return JSONResponse(
            status_code=400,
            content={
                "success": False,
                "message": f"Calendar OAuth failed: {str(e)}",
                "redirect_url": "http://localhost:5137/settings"
            }
        )

@app.get("/api/v1/gmail/callback")
async def gmail_oauth_callback(
    code: str,
    state: str,
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """Handle Gmail OAuth callback"""
    try:
        logger.info(f"📧 Gmail OAuth callback received - state: {state}, code: {code[:20]}...")
        
        # Handle demo users or unauthenticated requests
        if not current_user:
            logger.info("📧 Gmail OAuth callback for demo/unauthenticated user")
            user_id = state  # Use state parameter as user_id
            user_email = "sampath.prema@gmail.com"
        else:
            logger.info(f"📧 Gmail OAuth callback for user: {current_user.email}")
            user_id = current_user.id
            user_email = current_user.email
        
        # Create auth request object
        from models import GmailAuthRequest
        auth_request = GmailAuthRequest(
            authorization_code=code,
            redirect_uri="http://localhost:8000/api/v1/gmail/callback"
        )
        
        # Exchange code for tokens
        connection = await gmail_service.exchange_code_for_tokens(auth_request, user_id)
        
        # Store connection data in localStorage simulation
        gmail_connected_key = f"gmail_connected_{user_id}"
        localStorage_simulation[gmail_connected_key] = {
            "email_address": connection.email_address,
            "last_connected": datetime.now().isoformat(),
            "scopes": connection.scopes,
            "status": "connected"
        }
        
        logger.info(f"✅ Gmail OAuth completed for user: {user_email}")
        
        # Redirect to frontend with success message
        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "message": "Gmail connection established successfully",
                "email": connection.email_address,
                "redirect_url": "http://localhost:5137/settings"
            }
        )
        
    except Exception as e:
        logger.error(f"❌ Gmail OAuth callback error: {e}")
        return JSONResponse(
            status_code=400,
            content={
                "success": False,
                "message": f"Gmail OAuth failed: {str(e)}",
                "redirect_url": "http://localhost:5137/settings"
            }
        )

# CSV Import endpoints
@app.post("/api/v1/contacts/import/csv")
async def import_csv(
    file: UploadFile = File(...),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """Import contacts from CSV file"""
    try:
        # Handle demo users or unauthenticated requests
        if not current_user:
            logger.info("📊 CSV import request for demo/unauthenticated user")
            user_id = "demo-user-sampath"
            user_email = "sampath.prema@gmail.com"
        else:
            logger.info(f"📊 CSV import request for user: {current_user.email}")
            user_id = current_user.id
            user_email = current_user.email
        
        # Validate file type
        if not file.filename.lower().endswith('.csv'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only CSV files are supported"
            )
        
        # Read file content
        content = await file.read()
        
        # Process CSV using CSV service
        contacts, total_rows, errors = csv_service.process_csv_file(content)
        
        # Validate contacts
        valid_contacts, validation_errors = csv_service.validate_contacts(contacts)
        all_errors = errors + validation_errors
        
        # For demo purposes, we'll just return the results without saving to database
        # In a real implementation, you would save to the database here
        
        logger.info(f"✅ CSV import completed for user: {user_email} - {len(valid_contacts)} contacts imported")
        
        return {
            "success": True,
            "imported": len(valid_contacts),
            "total": total_rows,
            "contacts": [contact.dict() for contact in valid_contacts],
            "errors": all_errors[:50],  # Limit errors to first 50
            "uploadId": f"upload-{user_id}-{int(datetime.now().timestamp())}",
            "uploadedAt": datetime.now().isoformat(),
            "processingDuration": "< 1s"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ CSV import error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to import CSV: {str(e)}"
        )

# Contacts endpoints
@app.get("/api/v1/contacts")
async def get_contacts(
    limit: int = 1000,
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """Get contacts list"""
    try:
        # Handle demo users or unauthenticated requests
        if not current_user:
            logger.info("👥 Get contacts request for demo/unauthenticated user")
            user_email = "sampath.prema@gmail.com"
        else:
            logger.info(f"👥 Get contacts request for user: {current_user.email}")
            user_email = current_user.email
        
        # For demo purposes, return empty list
        # In a real implementation, you would fetch from database
        return {
            "contacts": [],
            "total": 0,
            "limit": limit
        }
        
    except Exception as e:
        logger.error(f"❌ Get contacts error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get contacts: {str(e)}"
        )

@app.get("/api/v1/contacts/stats")
async def get_contacts_stats(
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """Get contacts statistics"""
    try:
        # Handle demo users or unauthenticated requests
        if not current_user:
            logger.info("📊 Get contacts stats request for demo/unauthenticated user")
            user_email = "sampath.prema@gmail.com"
        else:
            logger.info(f"📊 Get contacts stats request for user: {current_user.email}")
            user_email = current_user.email
        
        # For demo purposes, return basic stats
        return {
            "total": 0,
            "byDegree": {
                "first": 0,
                "second": 0,
                "third": 0
            },
            "byStrength": {
                "strong": 0,
                "medium": 0,
                "weak": 0
            },
            "recentlyAdded": 0
        }
        
    except Exception as e:
        logger.error(f"❌ Get contacts stats error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get contacts stats: {str(e)}"
        )

@app.get("/api/v1/contacts/grouped-by-company")
async def get_contacts_grouped_by_company(
    require_title: bool = True,
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """Get contacts grouped by company"""
    try:
        # Handle demo users or unauthenticated requests
        if not current_user:
            logger.info("🏢 Get contacts grouped by company request for demo/unauthenticated user")
            user_email = "sampath.prema@gmail.com"
        else:
            logger.info(f"🏢 Get contacts grouped by company request for user: {current_user.email}")
            user_email = current_user.email
        
        # For demo purposes, return empty list
        return {
            "companies": [],
            "total": 0,
            "require_title": require_title
        }
        
    except Exception as e:
        logger.error(f"❌ Get contacts grouped by company error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get contacts grouped by company: {str(e)}"
        )

@app.get("/api/v1/target-companies")
async def get_target_companies(
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """Get target companies"""
    try:
        # Handle demo users or unauthenticated requests
        if not current_user:
            logger.info("🏢 Get target companies request for demo/unauthenticated user")
            user_email = "sampath.prema@gmail.com"
        else:
            logger.info(f"🏢 Get target companies request for user: {current_user.email}")
            user_email = current_user.email
        
        # For demo purposes, return empty list
        return {
            "companies": [],
            "total": 0
        }
        
    except Exception as e:
        logger.error(f"❌ Get target companies error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get target companies: {str(e)}"
        )

@app.get("/api/v1/file-uploads/")
async def get_file_uploads(
    limit: int = 3,
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """Get file upload history"""
    try:
        # Handle demo users or unauthenticated requests
        if not current_user:
            logger.info("📁 Get file uploads request for demo/unauthenticated user")
            user_email = "sampath.prema@gmail.com"
        else:
            logger.info(f"📁 Get file uploads request for user: {current_user.email}")
            user_email = current_user.email
        
        # For demo purposes, return empty list
        return {
            "uploads": [],
            "total": 0,
            "limit": limit
        }
        
    except Exception as e:
        logger.error(f"❌ Get file uploads error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get file uploads: {str(e)}"
        )

# Run the application
if __name__ == "__main__":
    import uvicorn
    
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")
    
    logger.info(f"🚀 Starting ConnectorPro API server on {host}:{port}")
    
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=True,
        log_level="info"
    )
