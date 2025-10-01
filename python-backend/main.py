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
from rag_service import NetworkRAGService, rag_service
from models import NetworkQueryRequest, NetworkQueryResponse

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global services
db_service = None
gmail_service = None
calendar_service = None
csv_service = None
llm_service = None
rag_service = None

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
    global db_service, enhanced_auth_service, gmail_service, calendar_service, csv_service, llm_service, rag_service
    
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
        
        logger.info("🧠 Initializing RAG service...")
        from rag_service import NetworkRAGService
        rag_service = NetworkRAGService(db_service)
        logger.info("✅ RAG service initialized")
        
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
    except ValueError as e:
        # Handle validation errors from Pydantic models
        logger.warning(f"❌ Registration validation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e)
        )
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

@app.post("/api/v1/gmail/send")
async def send_gmail_email(
    request: dict,
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """Send email via Gmail"""
    try:
        # Handle demo users or unauthenticated requests
        if not current_user:
            logger.info("📧 Gmail send email request for demo/unauthenticated user")
            user_id = "demo-user-sampath"
            user_email = "sampath.prema@gmail.com"
        else:
            logger.info(f"📧 Gmail send email request for user: {current_user.email}")
            user_id = current_user.id
            user_email = current_user.email
        
        # Extract email data from request
        to = request.get("to")
        subject = request.get("subject", "")
        body = request.get("body", "")
        body_type = request.get("body_type", "plain")
        cc = request.get("cc")
        bcc = request.get("bcc")
        
        if not to:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Recipient email address is required"
            )
        
        # Check Gmail connection status
        gmail_connected_key = f"gmail_connected_{user_id}"
        gmail_connection_data = localStorage_simulation.get(gmail_connected_key)
        
        if not gmail_connection_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Gmail not connected. Please connect your Gmail account first."
            )
        
        # For demo purposes, simulate sending email
        # In a real implementation, you would:
        # 1. Get the Gmail connection from database
        # 2. Use gmail_service.send_email() with proper credentials
        
        logger.info(f"📧 Simulating email send from {user_email} to {to}")
        logger.info(f"📧 Subject: {subject}")
        logger.info(f"📧 Body preview: {body[:100]}...")
        
        # Simulate successful send
        import uuid
        message_id = str(uuid.uuid4())
        
        return {
            "success": True,
            "message": "Email sent successfully",
            "message_id": message_id,
            "to": to,
            "subject": subject,
            "sent_at": datetime.now().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Gmail send email error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send email: {str(e)}"
        )

@app.post("/api/v1/calendar/create-event")
async def create_calendar_event(
    request: dict,
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """Create a calendar event"""
    try:
        # Handle demo users or unauthenticated requests
        if not current_user:
            logger.info("📅 Calendar create event request for demo/unauthenticated user")
            user_id = "demo-user-sampath"
            user_email = "sampath.prema@gmail.com"
        else:
            logger.info(f"📅 Calendar create event request for user: {current_user.email}")
            user_id = current_user.id
            user_email = current_user.email
        
        # Extract event data from request
        summary = request.get("summary")
        description = request.get("description", "")
        start_time = request.get("start_time")
        end_time = request.get("end_time")
        attendees = request.get("attendees", [])
        location = request.get("location", "")
        
        if not summary:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Event summary is required"
            )
        
        if not start_time or not end_time:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Start time and end time are required"
            )
        
        # Check Calendar connection status
        calendar_connected_key = f"calendar_connected_{user_id}"
        calendar_connection_data = localStorage_simulation.get(calendar_connected_key)
        
        if not calendar_connection_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Calendar not connected. Please connect your Google Calendar first."
            )
        
        # For demo purposes, simulate creating calendar event
        # In a real implementation, you would:
        # 1. Get the Calendar connection from database
        # 2. Use calendar_service.create_event() with proper credentials
        
        logger.info(f"📅 Simulating calendar event creation for {user_email}")
        logger.info(f"📅 Event: {summary}")
        logger.info(f"📅 Start: {start_time}, End: {end_time}")
        logger.info(f"📅 Attendees: {attendees}")
        
        # Simulate successful creation
        import uuid
        event_id = str(uuid.uuid4())
        
        return {
            "success": True,
            "message": "Calendar event created successfully",
            "event_id": event_id,
            "summary": summary,
            "start_time": start_time,
            "end_time": end_time,
            "attendees": attendees,
            "location": location,
            "created_at": datetime.now().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Calendar create event error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create calendar event: {str(e)}"
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
        
        # Save contacts to database
        saved_contacts = []
        if valid_contacts and db_service:
            try:
                # Add user_id to each contact
                for contact in valid_contacts:
                    contact.id = None  # Let MongoDB generate the ID
                    # Add user_id field to contact dict before saving
                    contact_dict = contact.dict()
                    contact_dict['user_id'] = user_id
                    
                    # Create contact in database
                    doc_result = await db_service.contacts_collection.insert_one(contact_dict)
                    contact.id = str(doc_result.inserted_id)
                    saved_contacts.append(contact)
                
                logger.info(f"✅ Saved {len(saved_contacts)} contacts to database for user: {user_email}")
            except Exception as db_error:
                logger.error(f"❌ Database save error: {db_error}")
                all_errors.append(f"Database save error: {str(db_error)}")
        
        logger.info(f"✅ CSV import completed for user: {user_email} - {len(saved_contacts)} contacts imported")
        
        return {
            "success": True,
            "imported": len(saved_contacts),
            "total": total_rows,
            "contacts": [contact.dict() for contact in saved_contacts],
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
            user_id = "demo-user-sampath"
            user_email = "sampath.prema@gmail.com"
        else:
            logger.info(f"📊 Get contacts stats request for user: {current_user.email}")
            user_id = current_user.id
            user_email = current_user.email
        
        # Use RAG service to get actual stats
        if rag_service and rag_service.data_retriever:
            stats = await rag_service.data_retriever._get_contact_stats(user_id, {})
            return {
                "totalActiveContacts": stats.get("totalActiveContacts", 0),
                "total": stats.get("totalActiveContacts", 0),
                "byDegree": {
                    "first": stats.get("totalActiveContacts", 0),
                    "second": 0,
                    "third": 0
                },
                "byStrength": {
                    "strong": 0,
                    "medium": stats.get("totalActiveContacts", 0),
                    "weak": 0
                },
                "recentlyAdded": 0
            }
        else:
            # Fallback to empty stats
            return {
                "totalActiveContacts": 0,
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
            user_id = "demo-user-sampath"
            user_email = "sampath.prema@gmail.com"
        else:
            logger.info(f"🏢 Get contacts grouped by company request for user: {current_user.email}")
            user_id = current_user.id
            user_email = current_user.email
        
        # Use RAG service to get actual data
        if rag_service and rag_service.data_retriever:
            params = {"require_title": require_title}
            result = await rag_service.data_retriever._get_contacts_grouped_by_company(user_id, params)
            
            if result.get("success"):
                return {
                    "success": True,
                    "companies": result.get("companies", {}),
                    "companies_with_contacts": result.get("companies_with_contacts", 0),
                    "total": result.get("total_contacts", 0),
                    "require_title": require_title
                }
            else:
                return {
                    "success": False,
                    "companies": {},
                    "companies_with_contacts": 0,
                    "total": 0,
                    "require_title": require_title,
                    "error": result.get("error", "Unknown error")
                }
        else:
            # Fallback to empty list
            return {
                "success": True,
                "companies": {},
                "companies_with_contacts": 0,
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
            user_id = "demo-user-sampath"
            user_email = "sampath.prema@gmail.com"
        else:
            logger.info(f"🏢 Get target companies request for user: {current_user.email}")
            user_id = current_user.id
            user_email = current_user.email
        
        # Use RAG service to get actual data
        if rag_service and rag_service.data_retriever:
            result = await rag_service.data_retriever._get_target_companies(user_id, {})
            
            if result.get("success"):
                companies = result.get("companies", [])
                return {
                    "success": True,
                    "companies": companies,
                    "total": len(companies)
                }
            else:
                return {
                    "success": False,
                    "companies": [],
                    "total": 0,
                    "error": result.get("error", "Unknown error")
                }
        else:
            # Fallback to empty list
            return {
                "success": True,
                "companies": [],
                "total": 0
            }
        
    except Exception as e:
        logger.error(f"❌ Get target companies error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get target companies: {str(e)}"
        )

@app.post("/api/v1/target-companies")
async def add_target_company(
    request: dict,
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """Add a target company"""
    try:
        # Handle demo users or unauthenticated requests
        if not current_user:
            logger.info("🏢 Add target company request for demo/unauthenticated user")
            user_id = "demo-user-sampath"
            user_email = "sampath.prema@gmail.com"
        else:
            logger.info(f"🏢 Add target company request for user: {current_user.email}")
            user_id = current_user.id
            user_email = current_user.email
        
        company_name = request.get("company_name")
        company_domains = request.get("company_domains", [])
        
        if not company_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="company_name is required"
            )
        
        # Create target company using database service
        if db_service:
            from models import UserTargetCompany
            from datetime import datetime
            
            target_company = UserTargetCompany(
                user_id=user_id,
                company_name=company_name,
                company_domains=company_domains,
                created_at=datetime.now(),
                updated_at=datetime.now()
            )
            
            saved_company = await db_service.create_target_company(target_company)
            
            logger.info(f"✅ Target company '{company_name}' added for user: {user_email}")
            
            return {
                "success": True,
                "message": f"Target company '{company_name}' added successfully",
                "company": {
                    "id": saved_company.id,
                    "company_name": saved_company.company_name,
                    "company_domains": saved_company.company_domains,
                    "created_at": saved_company.created_at.isoformat() if saved_company.created_at else None
                }
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Database service not available"
            )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Add target company error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to add target company: {str(e)}"
        )

@app.post("/api/v1/target-companies/bulk")
async def add_target_companies_bulk(
    request: dict,
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """Add multiple target companies"""
    try:
        # Handle demo users or unauthenticated requests
        if not current_user:
            logger.info("🏢 Bulk add target companies request for demo/unauthenticated user")
            user_id = "demo-user-sampath"
            user_email = "sampath.prema@gmail.com"
        else:
            logger.info(f"🏢 Bulk add target companies request for user: {current_user.email}")
            user_id = current_user.id
            user_email = current_user.email
        
        companies = request.get("companies", [])
        
        if not companies:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="companies array is required"
            )
        
        # Create target companies using database service
        saved_companies = []
        if db_service:
            from models import UserTargetCompany
            from datetime import datetime
            
            for company_data in companies:
                company_name = company_data.get("company_name") or company_data.get("name")
                company_domains = company_data.get("company_domains", [])
                
                if not company_name:
                    continue  # Skip invalid entries
                
                target_company = UserTargetCompany(
                    user_id=user_id,
                    company_name=company_name,
                    company_domains=company_domains,
                    created_at=datetime.now(),
                    updated_at=datetime.now()
                )
                
                try:
                    saved_company = await db_service.create_target_company(target_company)
                    saved_companies.append({
                        "id": saved_company.id,
                        "company_name": saved_company.company_name,
                        "company_domains": saved_company.company_domains,
                        "created_at": saved_company.created_at.isoformat() if saved_company.created_at else None
                    })
                except Exception as e:
                    logger.warning(f"Failed to save company '{company_name}': {e}")
                    continue
            
            logger.info(f"✅ {len(saved_companies)} target companies added for user: {user_email}")
            
            return {
                "success": True,
                "message": f"{len(saved_companies)} target companies added successfully",
                "companies": saved_companies,
                "total": len(saved_companies)
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Database service not available"
            )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Bulk add target companies error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to add target companies: {str(e)}"
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

# Network Query endpoint for AI Assistant
@app.post("/api/v1/network/query", response_model=NetworkQueryResponse)
async def process_network_query(
    request: NetworkQueryRequest,
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """Process natural language queries about the user's network using RAG"""
    try:
        # Handle demo users or unauthenticated requests
        if not current_user:
            logger.info("🧠 Network query request for demo/unauthenticated user")
            user_id = "demo-user-sampath"
            user_email = "sampath.prema@gmail.com"
        else:
            logger.info(f"🧠 Network query request for user: {current_user.email}")
            user_id = current_user.id
            user_email = current_user.email
        
        logger.info(f"🧠 Processing query: {request.query}")
        
        # Check if RAG service is available
        if not rag_service:
            logger.error("❌ RAG service not initialized")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="RAG service not available"
            )
        
        # Process the query using RAG service
        response = await rag_service.process_network_query(request, user_id)
        
        logger.info(f"✅ Network query processed successfully for user: {user_email}")
        logger.info(f"🧠 Query type: {response.query_type}, Confidence: {response.confidence}")
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Network query error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process network query: {str(e)}"
        )

@app.post("/api/v1/admin/fix-user-ids")
async def fix_user_ids():
    """Fix user IDs - move all non-demo contacts to demo user"""
    try:
        if not db_service:
            raise HTTPException(status_code=503, detail="Database not available")
        
        # Count total contacts
        total_count = await db_service.contacts_collection.count_documents({})
        logger.info(f"Total contacts in database: {total_count}")
        
        # Count current demo contacts
        demo_count = await db_service.contacts_collection.count_documents({'user_id': 'demo-user-sampath'})
        logger.info(f"Current demo contacts: {demo_count}")
        
        # Count contacts without user_id field
        no_user_id_count = await db_service.contacts_collection.count_documents({'user_id': {'$exists': False}})
        logger.info(f"Contacts without user_id field: {no_user_id_count}")
        
        # Get a sample contact to see its structure
        sample = await db_service.contacts_collection.find_one({})
        logger.info(f"Sample contact fields: {list(sample.keys()) if sample else 'No contacts found'}")
        
        # Find contacts that are not demo user (including those without user_id)
        non_demo_query = {
            '$or': [
                {'user_id': {'$ne': 'demo-user-sampath'}},
                {'user_id': {'$exists': False}}
            ]
        }
        non_demo_count = await db_service.contacts_collection.count_documents(non_demo_query)
        logger.info(f"Non-demo contacts to update: {non_demo_count}")
        
        if non_demo_count > 0:
            # Update all non-demo contacts to use demo-user-sampath
            result = await db_service.contacts_collection.update_many(
                non_demo_query,
                {'$set': {'user_id': 'demo-user-sampath'}}
            )
            
            new_demo_count = await db_service.contacts_collection.count_documents({'user_id': 'demo-user-sampath'})
            
            return {
                "success": True,
                "message": f"Updated {result.modified_count} contacts",
                "total_contacts": total_count,
                "old_demo_count": demo_count,
                "new_demo_count": new_demo_count,
                "contacts_updated": result.modified_count
            }
        else:
            return {
                "success": True,
                "message": "No non-demo contacts found to update",
                "total_contacts": total_count,
                "demo_count": demo_count
            }
            
    except Exception as e:
        logger.error(f"Fix user IDs error: {e}")
        import traceback
        logger.error(f"Full traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

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
