from fastapi import HTTPException, Depends, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional, Tuple
import jwt
import os
import secrets
import string
from datetime import datetime, timedelta
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import logging
from user_models import User, UserCreate, UserLogin, UserService, UserStatus, TokenResponse, UserResponse
from database import DatabaseService

logger = logging.getLogger(__name__)

# Rate limiter setup
limiter = Limiter(key_func=get_remote_address)

# Security scheme
security = HTTPBearer(auto_error=False)

# JWT settings with enhanced security
JWT_SECRET = os.getenv("JWT_SECRET")
JWT_ALGORITHM = "HS256"
JWT_ACCESS_TOKEN_EXPIRES = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRES", 900))  # 15 minutes
JWT_REFRESH_TOKEN_EXPIRES = int(os.getenv("JWT_REFRESH_TOKEN_EXPIRES", 604800))  # 7 days

# Validate JWT secret on startup
if not JWT_SECRET or len(JWT_SECRET) < 32:
    logger.error("JWT_SECRET must be set and at least 32 characters long for production")
    raise ValueError("Invalid JWT_SECRET configuration")

class EnhancedAuthService:
    def __init__(self, db_service: DatabaseService):
        self.db = db_service
        self.user_service = UserService()
    
    def generate_secure_token(self, length: int = 32) -> str:
        """Generate a cryptographically secure random token"""
        alphabet = string.ascii_letters + string.digits
        return ''.join(secrets.choice(alphabet) for _ in range(length))
    
    def create_access_token(self, user_id: str, email: str) -> str:
        """Create a JWT access token with enhanced security"""
        now = datetime.utcnow()
        payload = {
            "user_id": user_id,
            "email": email,
            "type": "access",
            "exp": now + timedelta(seconds=JWT_ACCESS_TOKEN_EXPIRES),
            "iat": now,
            "nbf": now,  # Not before
            "jti": self.generate_secure_token(16)  # JWT ID for token tracking
        }
        
        token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
        return token
    
    def create_refresh_token(self, user_id: str, email: str) -> str:
        """Create a JWT refresh token"""
        now = datetime.utcnow()
        payload = {
            "user_id": user_id,
            "email": email,
            "type": "refresh",
            "exp": now + timedelta(seconds=JWT_REFRESH_TOKEN_EXPIRES),
            "iat": now,
            "nbf": now,
            "jti": self.generate_secure_token(16)
        }
        
        token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
        return token
    
    def verify_token(self, token: str, token_type: str = "access") -> dict:
        """Verify and decode JWT token with enhanced validation"""
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            
            # Validate token type
            if payload.get("type") != token_type:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail=f"Invalid token type. Expected {token_type}"
                )
            
            # Validate required fields
            required_fields = ["user_id", "email", "exp", "iat", "jti"]
            for field in required_fields:
                if field not in payload:
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Invalid token structure"
                    )
            
            return payload
            
        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired"
            )
        except jwt.InvalidTokenError as e:
            logger.warning(f"Invalid token: {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )
    
    async def authenticate_user(self, email: str, password: str) -> Tuple[User, bool]:
        """Authenticate user with enhanced security checks"""
        try:
            # Get user from database
            user = await self.db.get_user_by_email(email)
            if not user:
                # Use constant time comparison to prevent timing attacks
                UserService.verify_password("dummy_password", "$2b$12$dummy.hash.to.prevent.timing.attacks")
                return None, False
            
            # Check if account is locked
            if UserService.is_account_locked(user):
                lock_remaining = (user.locked_until - datetime.now()).total_seconds()
                raise HTTPException(
                    status_code=status.HTTP_423_LOCKED,
                    detail=f"Account is locked. Try again in {int(lock_remaining/60)} minutes."
                )
            
            # Check account status
            if user.status != UserStatus.ACTIVE:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Account is not active"
                )
            
            # Verify password
            is_valid = UserService.verify_password(password, user.password_hash)
            
            if is_valid:
                # Reset login attempts on successful login
                await self.db.update_user_login_success(user.id)
                return user, True
            else:
                # Increment failed login attempts
                await self.db.increment_login_attempts(user.id)
                
                # Check if account should be locked
                updated_user = await self.db.get_user_by_id(user.id)
                if UserService.should_lock_account(updated_user.login_attempts):
                    lock_duration = UserService.get_lock_duration_minutes(updated_user.login_attempts)
                    await self.db.lock_user_account(user.id, lock_duration)
                
                return None, False
                
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Authentication error: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Authentication service error"
            )
    
    async def register_user(self, user_data: UserCreate) -> User:
        """Register a new user with validation"""
        try:
            # Check if user already exists
            existing_user = await self.db.get_user_by_email(user_data.email)
            if existing_user:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="User with this email already exists"
                )
            
            # Hash password
            password_hash = UserService.hash_password(user_data.password)
            
            # Create user object
            user = User(
                email=user_data.email,
                name=user_data.name,
                password_hash=password_hash,
                phone=user_data.phone,
                email_verification_token=self.generate_secure_token(),
                email_verification_expires=datetime.now() + timedelta(hours=24)
            )
            
            # Save to database
            created_user = await self.db.create_user(user)
            return created_user
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Registration error: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Registration service error"
            )
    
    async def refresh_access_token(self, refresh_token: str) -> TokenResponse:
        """Refresh access token using refresh token"""
        try:
            # Verify refresh token
            payload = self.verify_token(refresh_token, "refresh")
            
            # Get user from database
            user = await self.db.get_user_by_id(payload["user_id"])
            if not user or user.status != UserStatus.ACTIVE:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid refresh token"
                )
            
            # Create new tokens
            access_token = self.create_access_token(user.id, user.email)
            new_refresh_token = self.create_refresh_token(user.id, user.email)
            
            # Update last login
            await self.db.update_user_last_login(user.id)
            
            return TokenResponse(
                access_token=access_token,
                refresh_token=new_refresh_token,
                expires_in=JWT_ACCESS_TOKEN_EXPIRES,
                user=UserResponse(
                    id=user.id,
                    email=user.email,
                    name=user.name,
                    role=user.role,
                    status=user.status,
                    email_verified=user.email_verified,
                    phone=user.phone,
                    profile_picture=user.profile_picture,
                    last_login=user.last_login,
                    created_at=user.created_at,
                    updated_at=user.updated_at
                )
            )
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Token refresh error: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Token refresh service error"
            )

# Global auth service instance (will be initialized in main.py)
enhanced_auth_service: Optional[EnhancedAuthService] = None

def get_enhanced_auth_service() -> EnhancedAuthService:
    """Dependency to get the enhanced auth service"""
    if enhanced_auth_service is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service not initialized"
        )
    return enhanced_auth_service

async def get_current_user_enhanced(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    auth_service: EnhancedAuthService = Depends(get_enhanced_auth_service)
) -> User:
    """Get current user from JWT token (enhanced version with strict validation)"""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    try:
        # Verify the token
        payload = auth_service.verify_token(credentials.credentials, "access")
        
        # Get user from database
        user = await auth_service.db.get_user_by_id(payload["user_id"])
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found"
            )
        
        # Check user status
        if user.status != UserStatus.ACTIVE:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is not active"
            )
        
        return user
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get current user error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication"
        )

async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    auth_service: EnhancedAuthService = Depends(get_enhanced_auth_service)
) -> Optional[User]:
    """Get current user from JWT token (optional - returns None if not authenticated)"""
    if not credentials:
        return None
    
    try:
        return await get_current_user_enhanced(credentials, auth_service)
    except HTTPException:
        return None

# Rate limiting decorators
def auth_rate_limit():
    """Rate limit for authentication endpoints"""
    return limiter.limit("5/minute")

def general_rate_limit():
    """General rate limit for API endpoints"""
    return limiter.limit("100/minute")