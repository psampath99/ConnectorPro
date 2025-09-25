# ConnectorPro Backend Deployment Guide

## Prerequisites

- Docker and Docker Compose installed
- MongoDB Atlas account and connection string
- Google OAuth2 credentials (for Gmail/Calendar integration)
- Environment variables configured

## Environment Variables

Create a `.env` file with the following variables:

```bash
# Server Configuration
APP_ENV=production
PORT=8000

# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/connectorpro?retryWrites=true&w=majority

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=3600

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=https://yourdomain.com/api/v1/gmail/callback
GOOGLE_CALENDAR_REDIRECT_URI=https://yourdomain.com/api/v1/calendar/callback

# Encryption Key for token storage (32 bytes base64 encoded)
ENCRYPTION_KEY=your-base64-encoded-encryption-key

# RapidAPI Configuration (optional)
RAPIDAPI_KEY=your-rapidapi-key

# CORS Origins
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

## Local Development

1. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Run the server:**
   ```bash
   python main.py
   ```

3. **Access the API:**
   - API: http://localhost:8000
   - Health check: http://localhost:8000/healthz
   - API docs: http://localhost:8000/docs

## Docker Deployment

1. **Build and run with Docker Compose:**
   ```bash
   docker-compose up -d
   ```

2. **View logs:**
   ```bash
   docker-compose logs -f connectorpro-backend
   ```

3. **Stop the service:**
   ```bash
   docker-compose down
   ```

## Production Deployment

### Option 1: Cloud Platforms (Recommended)

#### Railway
1. Connect your GitHub repository
2. Set environment variables in Railway dashboard
3. Deploy automatically on push

#### Render
1. Create a new Web Service
2. Connect your repository
3. Set build command: `pip install -r requirements.txt`
4. Set start command: `python main.py`
5. Configure environment variables

#### Heroku
1. Create a Heroku app
2. Set buildpack: `heroku/python`
3. Configure environment variables
4. Deploy via Git or GitHub integration

### Option 2: VPS/Server Deployment

1. **Clone repository:**
   ```bash
   git clone <your-repo-url>
   cd ConnectorPro/python-backend
   ```

2. **Set up environment:**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. **Configure environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your values
   ```

4. **Run with process manager (PM2 or systemd):**
   ```bash
   # Using PM2
   pm2 start main.py --name connectorpro-backend --interpreter python

   # Or create a systemd service
   sudo systemctl enable connectorpro-backend
   sudo systemctl start connectorpro-backend
   ```

## Health Checks

The application includes built-in health checks:

- **Endpoint:** `GET /healthz`
- **Response:** `{"status": "ok", "database": "connected", "message": "Service is healthy"}`

## API Documentation

Once deployed, access the interactive API documentation at:
- Swagger UI: `https://yourdomain.com/docs`
- ReDoc: `https://yourdomain.com/redoc`

## Security Considerations

1. **Environment Variables:** Never commit `.env` files to version control
2. **JWT Secret:** Use a strong, randomly generated secret key
3. **Encryption Key:** Generate a secure base64-encoded key for token encryption
4. **CORS:** Configure CORS origins to match your frontend domain(s)
5. **HTTPS:** Always use HTTPS in production
6. **Database:** Ensure MongoDB Atlas has proper network access controls

## Monitoring

- Health check endpoint for uptime monitoring
- Application logs for debugging
- MongoDB Atlas monitoring for database performance

## Troubleshooting

### Common Issues

1. **Database Connection Failed:**
   - Check MongoDB URI format
   - Verify network access in MongoDB Atlas
   - Ensure IP whitelist includes your server

2. **Google OAuth Issues:**
   - Verify client ID and secret
   - Check redirect URIs in Google Console
   - Ensure proper scopes are configured

3. **Import Errors:**
   - Verify all dependencies are installed
   - Check Python version compatibility (3.9+)

### Logs

Check application logs for detailed error information:
```bash
# Docker
docker-compose logs connectorpro-backend

# Direct Python
python main.py  # Logs will appear in console
```

## Support

For deployment issues, check:
1. Application logs
2. Health check endpoint
3. MongoDB Atlas connection
4. Environment variable configuration