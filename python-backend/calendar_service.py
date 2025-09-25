import os
import base64
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

from models import (
    GmailConnection, GmailConnectionStatus, 
    GmailScope, GmailAuthRequest, GmailConnectionResponse,
    GmailStatusResponse
)
from encryption import encryption_service
import logging

logger = logging.getLogger(__name__)

class CalendarService:
    """Service for Google Calendar API integration with OAuth2 authentication"""
    
    def __init__(self):
        self._client_id = None
        self._client_secret = None
        self._redirect_uri = None
        
        # Default scopes for Calendar integration
        # Include "openid" since Google Console has OpenID enabled and automatically adds it
        self.default_scopes = [
            "https://www.googleapis.com/auth/calendar",
            "https://www.googleapis.com/auth/calendar.events",
            "https://www.googleapis.com/auth/userinfo.email",
            "openid"  # Added to work with Google Console OpenID setting
        ]
        
        self._load_credentials()
    
    def _scopes_match(self, current_scopes: List[str], required_scopes: List[str]) -> bool:
        """Check if current scopes match required scopes (ignoring order)"""
        # Since we now accept "openid" as a valid scope, we only filter out truly auto-added scopes
        # that we don't explicitly request (like 'profile' and 'email' when not requested)
        oauth_auto_scopes = {'profile', 'email'}  # Removed 'openid' since we now explicitly include it
        
        current_normalized = [scope for scope in current_scopes if scope not in oauth_auto_scopes]
        required_normalized = [scope for scope in required_scopes if scope not in oauth_auto_scopes]
        
        # Check if all required scopes are present in current scopes
        required_set = set(required_normalized)
        current_set = set(current_normalized)
        
        # Log scope comparison for debugging
        if required_set != current_set:
            logger.info(f"Calendar scope mismatch - Required: {sorted(required_set)}, Current: {sorted(current_set)}")
            missing_scopes = required_set - current_set
            extra_scopes = current_set - required_set
            if missing_scopes:
                logger.info(f"Missing scopes: {sorted(missing_scopes)}")
            if extra_scopes:
                logger.info(f"Extra scopes: {sorted(extra_scopes)}")
        
        return required_set == current_set
    
    def _load_credentials(self):
        """Load credentials from environment variables"""
        self._client_id = os.getenv("GOOGLE_CLIENT_ID")
        self._client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
        self._redirect_uri = os.getenv("GOOGLE_CALENDAR_REDIRECT_URI", "http://localhost:8000/api/v1/calendar/callback")
        
        if not self._client_id or not self._client_secret:
            logger.warning("Google OAuth credentials not configured. Calendar integration will not work.")
    
    @property
    def client_id(self):
        if not self._client_id:
            self._load_credentials()
        return self._client_id
    
    @property
    def client_secret(self):
        if not self._client_secret:
            self._load_credentials()
        return self._client_secret
    
    @property
    def redirect_uri(self):
        if not self._redirect_uri:
            self._load_credentials()
        return self._redirect_uri
    
    def get_authorization_url(self, user_id: str, scopes: Optional[List[str]] = None) -> str:
        """Generate OAuth2 authorization URL"""
        if not self.client_id or not self.client_secret:
            raise ValueError("Google OAuth credentials not configured")
        
        scopes = scopes or self.default_scopes
        
        # No longer filter out "openid" since we now explicitly include it in default_scopes
        
        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "redirect_uris": [self.redirect_uri]
                }
            },
            scopes=scopes
        )
        flow.redirect_uri = self.redirect_uri
        
        # Include user_id in state parameter for security
        # Remove include_granted_scopes to prevent Google from auto-adding openid scope
        auth_url, _ = flow.authorization_url(
            access_type='offline',
            state=user_id,
            prompt='consent'  # Force consent to get refresh token
        )
        
        return auth_url
    
    async def exchange_code_for_tokens(self, auth_request: GmailAuthRequest, user_id: str) -> GmailConnection:
        """Exchange authorization code for access and refresh tokens"""
        if not self.client_id or not self.client_secret:
            raise ValueError("Google OAuth credentials not configured")
        
        try:
            # Use default scopes as-is, including "openid"
            clean_scopes = self.default_scopes
            
            flow = Flow.from_client_config(
                {
                    "web": {
                        "client_id": self.client_id,
                        "client_secret": self.client_secret,
                        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                        "token_uri": "https://oauth2.googleapis.com/token",
                        "redirect_uris": [self.redirect_uri]
                    }
                },
                scopes=clean_scopes
            )
            flow.redirect_uri = auth_request.redirect_uri
            
            # Exchange authorization code for tokens
            flow.fetch_token(code=auth_request.authorization_code)
            
            credentials = flow.credentials
            
            # Get user's email address
            service = build('oauth2', 'v2', credentials=credentials)
            user_info = service.userinfo().get().execute()
            email_address = user_info['email']
            
            # Calculate token expiration
            expires_at = datetime.now() + timedelta(seconds=credentials.expiry.timestamp() - datetime.now().timestamp())
            
            # Encrypt tokens before storing
            encrypted_access, encrypted_refresh = encryption_service.encrypt_tokens(
                credentials.token,
                credentials.refresh_token or ""
            )
            
            # Store the actual scopes from credentials as-is (including openid)
            actual_scopes = credentials.scopes or clean_scopes
            
            # Create Calendar connection (reusing GmailConnection model for now)
            connection = GmailConnection(
                user_id=user_id,
                email_address=email_address,
                access_token=encrypted_access,
                refresh_token=encrypted_refresh,
                token_expires_at=expires_at,
                scopes=actual_scopes,
                status=GmailConnectionStatus.CONNECTED
            )
            
            return connection
            
        except Exception as e:
            logger.error(f"Error exchanging code for tokens: {e}")
            raise
    
    async def refresh_access_token(self, connection: GmailConnection) -> GmailConnection:
        """Refresh expired access token using refresh token"""
        try:
            if not self._scopes_match(connection.scopes, self.default_scopes):
                logger.warning(f"Calendar scope mismatch detected. Current: {connection.scopes}, Required: {self.default_scopes}")
                connection.status = GmailConnectionStatus.ERROR
                connection.error_message = "Scope mismatch - re-authentication required"
                raise ValueError("Scope mismatch - re-authentication required")
            
            # Decrypt tokens
            access_token, refresh_token = encryption_service.decrypt_tokens(
                connection.access_token,
                connection.refresh_token
            )
            
            if not refresh_token:
                raise ValueError("No refresh token available")
            
            # Create credentials object
            credentials = Credentials(
                token=access_token,
                refresh_token=refresh_token,
                token_uri="https://oauth2.googleapis.com/token",
                client_id=self.client_id,
                client_secret=self.client_secret,
                scopes=connection.scopes
            )
            
            # Refresh the token
            credentials.refresh(Request())
            
            # Update connection with new tokens
            expires_at = datetime.now() + timedelta(seconds=3600)
            
            encrypted_access, encrypted_refresh = encryption_service.encrypt_tokens(
                credentials.token,
                credentials.refresh_token or refresh_token
            )
            
            connection.access_token = encrypted_access
            connection.refresh_token = encrypted_refresh
            connection.token_expires_at = expires_at
            connection.status = GmailConnectionStatus.CONNECTED
            connection.updated_at = datetime.now()
            connection.error_message = None
            
            return connection
            
        except Exception as e:
            logger.error(f"Error refreshing access token: {e}")
            connection.status = GmailConnectionStatus.ERROR
            connection.error_message = str(e)
            raise
    
    async def get_calendar_service(self, connection: GmailConnection):
        """Get authenticated Calendar service instance"""
        try:
            if not self._scopes_match(connection.scopes, self.default_scopes):
                logger.warning(f"Calendar scope mismatch detected. Connection scopes: {connection.scopes}, Required: {self.default_scopes}")
                connection.status = GmailConnectionStatus.ERROR
                connection.error_message = "Scope mismatch - re-authentication required"
                raise ValueError("Scope mismatch - re-authentication required")
            
            # Check if token needs refresh
            if datetime.now() >= connection.token_expires_at:
                logger.info(f"Token expired for user {connection.user_id}, attempting refresh")
                connection = await self.refresh_access_token(connection)
            
            # Decrypt tokens
            access_token, refresh_token = encryption_service.decrypt_tokens(
                connection.access_token,
                connection.refresh_token
            )
            
            # Log credential fields for debugging
            logger.info(f"Creating credentials with fields: token={bool(access_token)}, refresh_token={bool(refresh_token)}, client_id={bool(self.client_id)}, client_secret={bool(self.client_secret)}")
            
            # Create credentials with ALL required fields for refresh
            credentials = Credentials(
                token=access_token,
                refresh_token=refresh_token,  # CRITICAL: Include refresh_token
                token_uri="https://oauth2.googleapis.com/token",
                client_id=self.client_id,
                client_secret=self.client_secret,
                scopes=connection.scopes
            )
            
            # Build Calendar service
            service = build('calendar', 'v3', credentials=credentials)
            return service, connection
            
        except Exception as e:
            logger.error(f"Error getting Calendar service: {e}")
            raise
    
    async def list_calendars(self, connection: GmailConnection) -> List[Dict[str, Any]]:
        """List user's calendars"""
        try:
            service, updated_connection = await self.get_calendar_service(connection)
            
            calendars_result = service.calendarList().list().execute()
            calendars = calendars_result.get('items', [])
            
            return calendars
            
        except Exception as e:
            logger.error(f"Error listing calendars: {e}")
            raise
    
    async def create_event(self, connection: GmailConnection, event_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a calendar event"""
        try:
            service, updated_connection = await self.get_calendar_service(connection)
            
            # Use primary calendar by default
            calendar_id = event_data.get('calendar_id', 'primary')
            
            event = service.events().insert(
                calendarId=calendar_id,
                body=event_data
            ).execute()
            
            return event
            
        except Exception as e:
            logger.error(f"Error creating calendar event: {e}")
            raise
    
    async def clear_invalid_tokens(self, db_service) -> int:
        """Clear Calendar connections with invalid or mismatched scopes"""
        try:
            # Get all Calendar connections (stored in same collection as Gmail for now)
            connections = await db_service.db.calendar_connections.find({}).to_list(length=None)
            cleared_count = 0
            
            for conn_doc in connections:
                connection_scopes = conn_doc.get('scopes', [])
                
                if not self._scopes_match(connection_scopes, self.default_scopes):
                    logger.info(f"Clearing calendar connection with mismatched scopes for user {conn_doc.get('user_id')}: {connection_scopes}")
                    await db_service.delete_calendar_connection(conn_doc['user_id'])
                    cleared_count += 1
                    
            logger.info(f"Cleared {cleared_count} Calendar connections with invalid scopes")
            return cleared_count
            
        except Exception as e:
            logger.error(f"Error clearing invalid tokens: {e}")
            return 0

# Global Calendar service instance
calendar_service = CalendarService()