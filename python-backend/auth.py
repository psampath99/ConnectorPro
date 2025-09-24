from fastapi import HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
import jwt
import os
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

# Security scheme
security = HTTPBearer(auto_error=False)

# JWT settings
JWT_SECRET = os.getenv("JWT_SECRET", "your-super-secret-jwt-key-change-this-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRES_IN = int(os.getenv("JWT_EXPIRES_IN", 3600))  # 1 hour default

class AuthService:
    @staticmethod
    def create_access_token(user_id: str, email: str) -> str:
        """Create a JWT access token"""
        payload = {
            "user_id": user_id,
            "email": email,
            "exp": datetime.utcnow() + timedelta(seconds=JWT_EXPIRES_IN),
            "iat": datetime.utcnow()
        }
        
        token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
        return token
    
    @staticmethod
    def verify_token(token: str) -> dict:
        """Verify and decode JWT token"""
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            return payload
        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired"
            )
        except jwt.JWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )

async def get_current_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)):
    """Get current user from JWT token (optional for demo mode)"""
    
    # For demo mode, allow requests without authentication
    if not credentials:
        # Return a demo user
        return {
            "user_id": "demo-user",
            "email": "demo@connectorpro.com",
            "name": "Demo User"
        }
    
    try:
        # Verify the token
        payload = AuthService.verify_token(credentials.credentials)
        return {
            "user_id": payload.get("user_id"),
            "email": payload.get("email")
        }
    except HTTPException:
        # If token is invalid, still allow demo mode
        return {
            "user_id": "demo-user",
            "email": "demo@connectorpro.com",
            "name": "Demo User"
        }

async def get_current_user_strict(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current user from JWT token (strict mode - requires valid token)"""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    
    payload = AuthService.verify_token(credentials.credentials)
    return {
        "user_id": payload.get("user_id"),
        "email": payload.get("email")
    }