import os
import base64
import email
import re
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

from models import (
    GmailConnection, GmailEmail, GmailConnectionStatus,
    GmailScope, GmailAuthRequest, GmailConnectionResponse,
    GmailStatusResponse, GmailEmailsResponse, GmailSendRequest,
    GmailSendResponse, EnhancedGmailEmail, ToolOriginatedMessage
)
from encryption import encryption_service
import logging

logger = logging.getLogger(__name__)

class GmailService:
    """Service for Gmail API integration with OAuth2 authentication"""
    
    def __init__(self):
        self._client_id = None
        self._client_secret = None
        self._redirect_uri = None
        
        # Default scopes for Gmail integration
        # Include "openid" since Google Console has OpenID enabled and automatically adds it
        self.default_scopes = [
            GmailScope.READONLY.value,
            GmailScope.SEND.value,
            GmailScope.USERINFO_EMAIL.value,
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
            logger.info(f"Scope mismatch - Required: {sorted(required_set)}, Current: {sorted(current_set)}")
            missing_scopes = required_set - current_set
            extra_scopes = current_set - required_set
            if missing_scopes:
                logger.info(f"Missing scopes: {sorted(missing_scopes)}")
            if extra_scopes:
                logger.info(f"Extra scopes: {sorted(extra_scopes)}")
        
        return required_set == current_set
    
    def _load_credentials(self):
        """Load credentials from environment variables"""
        # Force reload .env file to pick up changes
        from dotenv import load_dotenv
        load_dotenv(override=True)
        
        self._client_id = os.getenv("GOOGLE_CLIENT_ID")
        self._client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
        self._redirect_uri = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/api/v1/gmail/callback")
        
        # DEBUG LOGGING: Log loaded credentials
        logger.info(f"🔍 DEBUG - Loading OAuth credentials from environment (with .env reload):")
        logger.info(f"🔍 DEBUG - GOOGLE_CLIENT_ID: {self._client_id}")
        logger.info(f"🔍 DEBUG - GOOGLE_CLIENT_SECRET configured: {bool(self._client_secret)}")
        logger.info(f"🔍 DEBUG - GOOGLE_REDIRECT_URI: {self._redirect_uri}")
        
        if not self._client_id or not self._client_secret:
            logger.warning("Google OAuth credentials not configured. Gmail integration will not work.")
    
    @property
    def client_id(self):
        # Always reload credentials to pick up environment changes
        self._load_credentials()
        return self._client_id
    
    @property
    def client_secret(self):
        # Always reload credentials to pick up environment changes
        self._load_credentials()
        return self._client_secret
    
    @property
    def redirect_uri(self):
        # Always reload credentials to pick up environment changes
        self._load_credentials()
        return self._redirect_uri
    
    def get_authorization_url(self, user_id: str, scopes: Optional[List[str]] = None) -> str:
        """Generate OAuth2 authorization URL"""
        if not self.client_id or not self.client_secret:
            raise ValueError("Google OAuth credentials not configured")
        
        scopes = scopes or self.default_scopes
        
        # DEBUG LOGGING: Log all OAuth configuration details
        logger.info("🔍 DEBUG - OAuth URL Generation Starting")
        logger.info(f"🔍 DEBUG - Client ID: {self.client_id}")
        logger.info(f"🔍 DEBUG - Client ID ends with .apps.googleusercontent.com: {self.client_id.endswith('.apps.googleusercontent.com') if self.client_id else False}")
        logger.info(f"🔍 DEBUG - Client Secret configured: {bool(self.client_secret)}")
        logger.info(f"🔍 DEBUG - Redirect URI: {self.redirect_uri}")
        logger.info(f"🔍 DEBUG - User ID (state): {user_id}")
        logger.info(f"🔍 DEBUG - Requested scopes: {scopes}")
        
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
        
        # DEBUG LOGGING: Log the complete generated URL and its components
        logger.info(f"🔍 DEBUG - Generated OAuth URL: {auth_url}")
        
        # Parse and log URL components for detailed analysis
        from urllib.parse import urlparse, parse_qs
        parsed_url = urlparse(auth_url)
        query_params = parse_qs(parsed_url.query)
        
        logger.info("🔍 DEBUG - OAuth URL Components:")
        logger.info(f"  - Base URL: {parsed_url.scheme}://{parsed_url.netloc}{parsed_url.path}")
        logger.info(f"  - response_type: {query_params.get('response_type', ['NOT_SET'])}")
        logger.info(f"  - client_id: {query_params.get('client_id', ['NOT_SET'])}")
        logger.info(f"  - redirect_uri: {query_params.get('redirect_uri', ['NOT_SET'])}")
        logger.info(f"  - scope: {query_params.get('scope', ['NOT_SET'])}")
        logger.info(f"  - state: {query_params.get('state', ['NOT_SET'])}")
        logger.info(f"  - access_type: {query_params.get('access_type', ['NOT_SET'])}")
        logger.info(f"  - prompt: {query_params.get('prompt', ['NOT_SET'])}")
        
        # Check for proper URL encoding
        import urllib.parse
        if 'scope' in query_params:
            raw_scope = query_params['scope'][0] if query_params['scope'] else ''
            logger.info(f"🔍 DEBUG - Raw scope parameter: {raw_scope}")
            logger.info(f"🔍 DEBUG - Scope is URL encoded: {raw_scope != urllib.parse.unquote(raw_scope)}")
        
        # Validate critical parameters
        validation_errors = []
        if not query_params.get('client_id'):
            validation_errors.append("Missing client_id parameter")
        elif not query_params['client_id'][0].endswith('.apps.googleusercontent.com'):
            validation_errors.append(f"Invalid client_id format: {query_params['client_id'][0]}")
        
        if not query_params.get('redirect_uri'):
            validation_errors.append("Missing redirect_uri parameter")
        
        if not query_params.get('scope'):
            validation_errors.append("Missing scope parameter")
        
        if validation_errors:
            logger.error(f"🔍 DEBUG - OAuth URL Validation Errors: {validation_errors}")
        else:
            logger.info("🔍 DEBUG - OAuth URL validation passed")
        
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
            service = build('gmail', 'v1', credentials=credentials)
            profile = service.users().getProfile(userId='me').execute()
            email_address = profile['emailAddress']
            
            # Calculate token expiration
            expires_at = datetime.now() + timedelta(seconds=credentials.expiry.timestamp() - datetime.now().timestamp())
            
            # Encrypt tokens before storing
            encrypted_access, encrypted_refresh = encryption_service.encrypt_tokens(
                credentials.token,
                credentials.refresh_token or ""
            )
            
            # Store the actual scopes from credentials as-is (including openid)
            actual_scopes = credentials.scopes or clean_scopes
            
            # Create Gmail connection
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
            # Check if scopes have changed - if so, force re-authentication
            if not self._scopes_match(connection.scopes, self.default_scopes):
                logger.warning(f"Scope mismatch detected. Current: {connection.scopes}, Required: {self.default_scopes}")
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
            expires_at = datetime.now() + timedelta(seconds=3600)  # Typically 1 hour
            
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
    
    async def get_gmail_service(self, connection: GmailConnection):
        """Get authenticated Gmail service instance"""
        try:
            # Check if scopes match before proceeding
            if not self._scopes_match(connection.scopes, self.default_scopes):
                logger.warning(f"Scope mismatch detected. Connection scopes: {connection.scopes}, Required: {self.default_scopes}")
                connection.status = GmailConnectionStatus.ERROR
                connection.error_message = "Scope mismatch - re-authentication required"
                raise ValueError("Scope mismatch - re-authentication required")
            
            # Check if token needs refresh
            if datetime.now() >= connection.token_expires_at:
                logger.info(f"Gmail token expired for user {connection.user_id}, attempting refresh")
                connection = await self.refresh_access_token(connection)
            
            # Decrypt tokens
            access_token, refresh_token = encryption_service.decrypt_tokens(
                connection.access_token,
                connection.refresh_token
            )
            
            # Log credential fields for debugging
            logger.info(f"Creating Gmail credentials with fields: token={bool(access_token)}, refresh_token={bool(refresh_token)}, client_id={bool(self.client_id)}, client_secret={bool(self.client_secret)}")
            
            # Create credentials with ALL required fields for refresh
            credentials = Credentials(
                token=access_token,
                refresh_token=refresh_token,  # CRITICAL: Include refresh_token
                token_uri="https://oauth2.googleapis.com/token",
                client_id=self.client_id,
                client_secret=self.client_secret,
                scopes=connection.scopes
            )
            
            # Build Gmail service
            service = build('gmail', 'v1', credentials=credentials)
            return service, connection
            
        except Exception as e:
            logger.error(f"Error getting Gmail service: {e}")
            raise
    
    async def list_emails(self, connection: GmailConnection, query: str = "", max_results: int = 10, page_token: str = None) -> GmailEmailsResponse:
        """List emails from Gmail"""
        try:
            service, updated_connection = await self.get_gmail_service(connection)
            
            # List messages
            request_params = {
                'userId': 'me',
                'q': query,
                'maxResults': max_results
            }
            if page_token:
                request_params['pageToken'] = page_token
            
            results = service.users().messages().list(**request_params).execute()
            messages = results.get('messages', [])
            next_page_token = results.get('nextPageToken')
            
            emails = []
            for message in messages:
                try:
                    # Get full message details
                    msg = service.users().messages().get(userId='me', id=message['id']).execute()
                    
                    # Parse message
                    email_obj = self._parse_gmail_message(msg)
                    emails.append(email_obj)
                    
                except Exception as e:
                    logger.error(f"Error parsing message {message['id']}: {e}")
                    continue
            
            return GmailEmailsResponse(
                emails=emails,
                total=len(emails),
                next_page_token=next_page_token
            )
            
        except Exception as e:
            logger.error(f"Error listing emails: {e}")
            raise
    
    def flexible_domain_match(self, email_address: str, target_company: str) -> bool:
        """
        Flexible domain matching algorithm that matches company names to email domains.
        
        Args:
            email_address: The email address to check
            target_company: The target company string to match against
            
        Returns:
            bool: True if the email domain matches the target company
        """
        if not email_address or not target_company:
            return False
        
        # Extract domain from email
        if '@' not in email_address:
            return False
        
        domain = email_address.split('@')[-1].lower()
        target_lower = target_company.lower().strip()
        
        # Remove common suffixes and prefixes for better matching
        target_clean = re.sub(r'\b(inc|corp|corporation|company|co|ltd|llc)\b', '', target_lower).strip()
        target_clean = re.sub(r'[^a-z0-9]', '', target_clean)  # Remove non-alphanumeric
        
        # Check if target company string is contained in the domain
        # This handles cases like "example" matching "example.com", "sub.example.co", etc.
        if target_clean in domain:
            return True
        
        # Check if domain contains the target company as a word boundary
        domain_clean = re.sub(r'[^a-z0-9]', '', domain)
        if target_clean in domain_clean:
            return True
        
        return False
    
    def get_default_company_domains(self, company: str) -> List[str]:
        """
        Get default domain mappings for well-known companies.
        
        Args:
            company: Company name
            
        Returns:
            List of known domains for the company
        """
        company_lower = company.lower().replace(' ', '').replace('.', '')
        
        # Map common company names to their actual domains
        domain_mapping = {
            'meta': ['meta.com', 'facebook.com', 'fb.com'],
            'google': ['google.com', 'gmail.com'],
            'microsoft': ['microsoft.com', 'outlook.com', 'hotmail.com'],
            'apple': ['apple.com', 'icloud.com'],
            'amazon': ['amazon.com', 'aws.com'],
            'stripe': ['stripe.com'],
            'airbnb': ['airbnb.com'],
            'netflix': ['netflix.com'],
            'tesla': ['tesla.com'],
            'uber': ['uber.com'],
            'spotify': ['spotify.com'],
            'twitter': ['twitter.com', 'x.com'],
            'linkedin': ['linkedin.com'],
            'salesforce': ['salesforce.com'],
            'adobe': ['adobe.com'],
            'slack': ['slack.com'],
            'zoom': ['zoom.us'],
            'dropbox': ['dropbox.com'],
            'github': ['github.com'],
            'gitlab': ['gitlab.com'],
            'atlassian': ['atlassian.com'],
            'shopify': ['shopify.com'],
            'square': ['squareup.com', 'square.com'],
            'paypal': ['paypal.com'],
            'coinbase': ['coinbase.com'],
            'robinhood': ['robinhood.com'],
            'twilio': ['twilio.com'],
            'sendgrid': ['sendgrid.com'],
            'mailchimp': ['mailchimp.com'],
            'hubspot': ['hubspot.com'],
            'zendesk': ['zendesk.com'],
            'intercom': ['intercom.com'],
            'notion': ['notion.so'],
            'figma': ['figma.com'],
            'canva': ['canva.com'],
            'discord': ['discord.com'],
            'reddit': ['reddit.com'],
            'pinterest': ['pinterest.com'],
            'snapchat': ['snap.com'],
            'tiktok': ['tiktok.com'],
            'bytedance': ['bytedance.com']
        }
        
        return domain_mapping.get(company_lower, [f"{company_lower}.com"])
    
    async def mark_message_as_tool_originated(self, user_id: str, message_id: str, thread_id: str, tool_name: str = "ConnectorPro") -> ToolOriginatedMessage:
        """
        Mark a message as tool-originated for future filtering.
        
        Args:
            user_id: User ID
            message_id: Gmail message ID
            thread_id: Gmail thread ID
            tool_name: Name of the tool that originated the message
            
        Returns:
            ToolOriginatedMessage: The created record
        """
        tool_message = ToolOriginatedMessage(
            user_id=user_id,
            message_id=message_id,
            thread_id=thread_id,
            initiated_by_tool=True,
            tool_name=tool_name
        )
        return tool_message
    
    async def send_email(self, connection: GmailConnection, send_request: GmailSendRequest) -> GmailSendResponse:
        """Send email via Gmail"""
        try:
            service, updated_connection = await self.get_gmail_service(connection)
            
            # Create message
            if send_request.body_type == "html":
                message = MIMEMultipart('alternative')
                html_part = MIMEText(send_request.body, 'html')
                message.attach(html_part)
            else:
                message = MIMEText(send_request.body, 'plain')
            
            message['to'] = send_request.to
            message['subject'] = send_request.subject
            
            if send_request.cc:
                message['cc'] = send_request.cc
            if send_request.bcc:
                message['bcc'] = send_request.bcc
            
            # Encode message
            raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode()
            
            # Send message
            send_result = service.users().messages().send(
                userId='me',
                body={'raw': raw_message}
            ).execute()
            
            response = GmailSendResponse(
                success=True,
                message="Email sent successfully",
                message_id=send_result['id'],
                thread_id=send_result.get('threadId')
            )
            
            # Mark this message as tool-originated for future filtering
            # Note: In a real implementation, you would store this in the database
            # For now, we'll return the response with the understanding that
            # the calling code should handle the tool-originated marking
            
            return response
            
        except Exception as e:
            logger.error(f"Error sending email: {e}")
            return GmailSendResponse(
                success=False,
                message=f"Failed to send email: {str(e)}"
            )
    
    def _parse_gmail_message(self, msg: Dict[str, Any]) -> GmailEmail:
        """Parse Gmail message into GmailEmail object"""
        headers = {h['name']: h['value'] for h in msg['payload'].get('headers', [])}
        
        # Extract body
        body_text = ""
        body_html = ""
        
        if 'parts' in msg['payload']:
            for part in msg['payload']['parts']:
                if part['mimeType'] == 'text/plain' and 'data' in part['body']:
                    body_text = base64.urlsafe_b64decode(part['body']['data']).decode('utf-8')
                elif part['mimeType'] == 'text/html' and 'data' in part['body']:
                    body_html = base64.urlsafe_b64decode(part['body']['data']).decode('utf-8')
        elif msg['payload']['mimeType'] == 'text/plain' and 'data' in msg['payload']['body']:
            body_text = base64.urlsafe_b64decode(msg['payload']['body']['data']).decode('utf-8')
        elif msg['payload']['mimeType'] == 'text/html' and 'data' in msg['payload']['body']:
            body_html = base64.urlsafe_b64decode(msg['payload']['body']['data']).decode('utf-8')
        
        # Parse date
        date_str = headers.get('Date', '')
        try:
            date = email.utils.parsedate_to_datetime(date_str)
        except:
            date = datetime.now()
        
        return GmailEmail(
            id=msg['id'],
            thread_id=msg['threadId'],
            subject=headers.get('Subject', ''),
            sender=headers.get('From', ''),
            recipient=headers.get('To', ''),
            date=date,
            snippet=msg.get('snippet', ''),
            body_text=body_text,
            body_html=body_html,
            labels=msg.get('labelIds', []),
            is_read='UNREAD' not in msg.get('labelIds', []),
            is_important='IMPORTANT' in msg.get('labelIds', []),
            has_attachments=any(part.get('filename') for part in msg['payload'].get('parts', []))
        )
    
    async def clear_invalid_tokens(self, db_service) -> int:
        """Clear Gmail connections with invalid or mismatched scopes"""
        try:
            # Get all Gmail connections
            connections = await db_service.db.gmail_connections.find({}).to_list(length=None)
            cleared_count = 0
            
            for conn_doc in connections:
                connection_scopes = conn_doc.get('scopes', [])
                
                # Check if scopes don't match current requirements
                if not self._scopes_match(connection_scopes, self.default_scopes):
                    logger.info(f"Clearing connection with mismatched scopes for user {conn_doc.get('user_id')}: {connection_scopes}")
                    await db_service.delete_gmail_connection(conn_doc['user_id'])
                    cleared_count += 1
                    
            logger.info(f"Cleared {cleared_count} Gmail connections with invalid scopes")
            return cleared_count
            
        except Exception as e:
            logger.error(f"Error clearing invalid tokens: {e}")
            return 0

# Global Gmail service instance
gmail_service = GmailService()