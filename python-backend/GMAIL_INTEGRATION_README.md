# Gmail Integration for ConnectorPro

This document describes the Gmail integration implementation for ConnectorPro, which allows users to connect their Gmail accounts via OAuth2, read emails, and send messages.

## Overview

The Gmail integration provides:
- **OAuth2 Authentication**: Secure connection to Gmail accounts using Google's official OAuth2 flow
- **Email Reading**: List and search emails with various filters
- **Email Sending**: Send emails with support for HTML/text content, CC, and BCC
- **Token Management**: Automatic token refresh and secure encrypted storage
- **Connection Management**: Connect, disconnect, and monitor connection status

## Architecture

### Backend Components

1. **Models** (`models.py`)
   - `GmailConnection`: Stores encrypted OAuth tokens and connection metadata
   - `GmailEmail`: Represents email data structure
   - Request/Response models for API endpoints

2. **Services**
   - `GmailService` (`gmail_service.py`): Core Gmail API integration
   - `EncryptionService` (`encryption.py`): Token encryption/decryption
   - `DatabaseService` (`database.py`): Gmail connection persistence

3. **API Endpoints** (`main.py`)
   - `GET /api/v1/gmail/auth-url`: Get OAuth2 authorization URL
   - `POST /api/v1/gmail/connect`: Connect Gmail account with authorization code
   - `GET /api/v1/gmail/status`: Check connection status
   - `DELETE /api/v1/gmail/disconnect`: Disconnect Gmail account
   - `GET /api/v1/gmail/emails`: List emails with optional search
   - `POST /api/v1/gmail/search`: Search emails with advanced queries
   - `POST /api/v1/gmail/send`: Send emails

### Frontend Components

1. **GmailIntegration Component** (`GmailIntegration.tsx`)
   - Connection management UI
   - Email viewing and searching
   - Email composition and sending
   - Status monitoring

## Setup Instructions

### 1. Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the Gmail API:
   - Go to "APIs & Services" > "Library"
   - Search for "Gmail API" and enable it
4. Create OAuth2 credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth 2.0 Client IDs"
   - Choose "Web application"
   - Add authorized redirect URIs:
     - `http://localhost:8000/api/v1/gmail/callback` (for development)
     - Your production callback URL
5. Note down the Client ID and Client Secret

### 2. Environment Configuration

Add the following to your `.env` file:

```env
# Gmail Integration (Google OAuth2)
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:8000/api/v1/gmail/callback

# Encryption (for token storage)
ENCRYPTION_KEY=your-secure-encryption-key-32-chars-min
```

### 3. Install Dependencies

The required dependencies are already included in `requirements.txt`:

```
google-auth==2.23.4
google-auth-oauthlib==1.1.0
google-auth-httplib2==0.1.1
google-api-python-client==2.108.0
cryptography==41.0.7
```

Install them with:
```bash
pip install -r requirements.txt
```

## Security Features

### Token Encryption
- All OAuth tokens are encrypted before storage using Fernet (AES 128)
- Encryption key is derived using PBKDF2 with 100,000 iterations
- Tokens are never stored in plain text

### Scope Management
- Minimal required scopes are requested:
  - `https://www.googleapis.com/auth/gmail.readonly` - Read emails
  - `https://www.googleapis.com/auth/gmail.send` - Send emails
- Additional scopes can be configured as needed

### Token Refresh
- Automatic token refresh when tokens expire
- Graceful handling of revoked tokens
- Connection status monitoring

## API Usage Examples

### 1. Get Authorization URL

```bash
curl -X GET "http://localhost:8000/api/v1/gmail/auth-url" \
  -H "Authorization: Bearer your-jwt-token"
```

Response:
```json
{
  "success": true,
  "message": "Authorization URL generated successfully",
  "auth_url": "https://accounts.google.com/o/oauth2/auth?..."
}
```

### 2. Connect Gmail Account

```bash
curl -X POST "http://localhost:8000/api/v1/gmail/connect" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-jwt-token" \
  -d '{
    "authorization_code": "4/0AX4XfWh...",
    "redirect_uri": "http://localhost:8000/api/v1/gmail/callback"
  }'
```

### 3. Check Connection Status

```bash
curl -X GET "http://localhost:8000/api/v1/gmail/status" \
  -H "Authorization: Bearer your-jwt-token"
```

Response:
```json
{
  "status": "connected",
  "email_address": "user@gmail.com",
  "last_connected": "2024-01-15T10:30:00Z",
  "scopes": [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.send"
  ]
}
```

### 4. List Emails

```bash
curl -X GET "http://localhost:8000/api/v1/gmail/emails?query=is:unread&max_results=10" \
  -H "Authorization: Bearer your-jwt-token"
```

### 5. Send Email

```bash
curl -X POST "http://localhost:8000/api/v1/gmail/send" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-jwt-token" \
  -d '{
    "to": "recipient@example.com",
    "subject": "Test Email",
    "body": "Hello from ConnectorPro!",
    "body_type": "text"
  }'
```

## Gmail Search Queries

The Gmail API supports powerful search queries:

- `from:sender@example.com` - Emails from specific sender
- `to:recipient@example.com` - Emails to specific recipient
- `subject:meeting` - Emails with "meeting" in subject
- `is:unread` - Unread emails
- `is:important` - Important emails
- `has:attachment` - Emails with attachments
- `after:2024/01/01` - Emails after specific date
- `before:2024/12/31` - Emails before specific date
- `label:inbox` - Emails in specific label

## Error Handling

The integration handles various error scenarios:

1. **Token Expiration**: Automatic refresh using refresh token
2. **Token Revocation**: Clear connection and prompt re-authorization
3. **API Rate Limits**: Proper error messages and retry logic
4. **Network Issues**: Graceful degradation and error reporting
5. **Invalid Permissions**: Clear messaging about required scopes

## Database Schema

### gmail_connections Collection

```javascript
{
  _id: ObjectId,
  user_id: String,           // User identifier
  email_address: String,     // Connected Gmail address
  access_token: String,      // Encrypted access token
  refresh_token: String,     // Encrypted refresh token
  token_expires_at: Date,    // Token expiration timestamp
  scopes: [String],          // Granted OAuth scopes
  status: String,            // connected|not_connected|error|expired
  last_connected: Date,      // Last successful connection
  created_at: Date,          // Connection creation time
  updated_at: Date,          // Last update time
  error_message: String      // Last error (if any)
}
```

## Frontend Integration

To use the Gmail integration in your React components:

```tsx
import { GmailIntegration } from '@/components/integrations/GmailIntegration';

function MyComponent() {
  const handleEmailsLoaded = (emails) => {
    console.log('Loaded emails:', emails);
  };

  return (
    <GmailIntegration onEmailsLoaded={handleEmailsLoaded} />
  );
}
```

## Production Considerations

1. **OAuth Callback**: Implement a proper OAuth callback handler
2. **HTTPS**: Use HTTPS for all OAuth flows in production
3. **Rate Limiting**: Implement rate limiting for API endpoints
4. **Monitoring**: Add logging and monitoring for token refresh failures
5. **Backup**: Regular backup of encrypted connection data
6. **Compliance**: Ensure compliance with Google's API Terms of Service

## Troubleshooting

### Common Issues

1. **"Google OAuth credentials not configured"**
   - Ensure `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set in `.env`

2. **"Invalid token" errors**
   - Check if tokens have expired or been revoked
   - Re-authorize the connection

3. **"Insufficient permissions" errors**
   - Verify the required scopes are granted during OAuth flow
   - Check if user has necessary Gmail access

4. **Encryption errors**
   - Ensure `ENCRYPTION_KEY` is set and consistent
   - Key should be at least 32 characters long

### Debug Mode

Enable debug logging by setting:
```env
LOG_LEVEL=DEBUG
```

This will provide detailed information about OAuth flows, API calls, and token management.

## Future Enhancements

Potential improvements for the Gmail integration:

1. **Email Templates**: Pre-defined email templates for common use cases
2. **Batch Operations**: Send multiple emails in batch
3. **Advanced Filtering**: More sophisticated email filtering options
4. **Attachment Support**: Handle email attachments
5. **Email Threading**: Support for email conversation threads
6. **Webhook Support**: Real-time email notifications via webhooks
7. **Multiple Accounts**: Support for multiple Gmail accounts per user

## Support

For issues or questions about the Gmail integration:

1. Check the logs for detailed error messages
2. Verify OAuth credentials and permissions
3. Test with a simple Gmail API call to isolate issues
4. Review Google's Gmail API documentation for API-specific issues