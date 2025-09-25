# ConnectorPro Backend - Production Deployment Guide

## 🚀 Quick Start

This guide provides step-by-step instructions for deploying the ConnectorPro backend to production.

## 📋 Prerequisites

- Docker and Docker Compose installed
- MongoDB Atlas account and connection string
- Google OAuth2 credentials (for Gmail/Calendar integration)
- Domain name and SSL certificates (for production)

## 🛠️ Deployment Files Overview

The following files have been created for production deployment:

- **`.env.production`** - Production environment variables template
- **`docker-compose.production.yml`** - Production Docker Compose configuration
- **`nginx.conf`** - Nginx reverse proxy configuration
- **`build-production.sh`** - Automated build script
- **`verify-deployment.sh`** - Deployment verification script

## 🔧 Step-by-Step Deployment

### Step 1: Configure Environment Variables

1. Copy the production environment template:
   ```bash
   cp .env.production .env
   ```

2. Edit `.env` with your production values:
   ```bash
   # Required: MongoDB Atlas connection string
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/connectorpro?retryWrites=true&w=majority
   
   # Required: Strong JWT secret (minimum 32 characters)
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-min-32-chars
   
   # Required: Google OAuth credentials
   GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   GOOGLE_REDIRECT_URI=https://yourdomain.com/api/v1/gmail/callback
   GOOGLE_CALENDAR_REDIRECT_URI=https://yourdomain.com/api/v1/calendar/callback
   
   # Required: Encryption key for token storage
   ENCRYPTION_KEY=your-base64-encoded-encryption-key-32-bytes
   
   # Required: CORS origins for your frontend
   CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
   ```

3. Generate secure keys:
   ```bash
   # Generate JWT secret
   openssl rand -base64 32
   
   # Generate encryption key
   python3 -c "import base64; import os; print(base64.b64encode(os.urandom(32)).decode())"
   ```

### Step 2: Build and Deploy

#### Option A: Using the Build Script (Recommended)

```bash
# Make the script executable
chmod +x build-production.sh

# Run the build script
./build-production.sh
```

This script will:
- Create a production build directory
- Build the Docker image
- Test the image
- Create a deployment package

#### Option B: Manual Docker Build

```bash
# Build the Docker image
docker build -t connectorpro-backend:latest .

# Run with production compose file
docker-compose -f docker-compose.production.yml up -d
```

### Step 3: Verify Deployment

Run the verification script to ensure everything is working:

```bash
# Make the script executable
chmod +x verify-deployment.sh

# Run verification tests
./verify-deployment.sh
```

Expected output:
```
🔍 ConnectorPro Backend Deployment Verification
==============================================
✅ All deployment verification tests passed! 🎉
```

### Step 4: Production Monitoring

#### Health Check Endpoint
- **URL**: `https://yourdomain.com/healthz`
- **Expected Response**: `{"status":"ok","database":"connected","message":"Service is healthy"}`

#### API Documentation
- **URL**: `https://yourdomain.com/docs`
- Interactive Swagger UI for API testing

#### Container Logs
```bash
# View logs
docker-compose -f docker-compose.production.yml logs -f connectorpro-backend

# View specific container logs
docker logs connectorpro-backend-prod
```

## 🌐 Deployment Platforms

### Railway (Recommended)

1. Connect your GitHub repository to Railway
2. Set environment variables in Railway dashboard
3. Deploy automatically on push

### Render

1. Create a new Web Service
2. Connect your repository
3. Set build command: `pip install -r requirements.txt`
4. Set start command: `python main.py`
5. Configure environment variables

### Heroku

1. Create a Heroku app
2. Set buildpack: `heroku/python`
3. Configure environment variables
4. Deploy via Git or GitHub integration

### VPS/Server Deployment

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
   cp .env.production .env
   # Edit .env with your values
   ```

4. **Run with process manager:**
   ```bash
   # Using PM2
   pm2 start main.py --name connectorpro-backend --interpreter python
   
   # Or create a systemd service
   sudo systemctl enable connectorpro-backend
   sudo systemctl start connectorpro-backend
   ```

## 🔒 Security Considerations

### Environment Variables
- ✅ Never commit `.env` files to version control
- ✅ Use strong, randomly generated secrets
- ✅ Rotate keys regularly

### Database Security
- ✅ Use MongoDB Atlas with proper network access controls
- ✅ Enable authentication and authorization
- ✅ Use connection string with SSL

### API Security
- ✅ Configure CORS origins to match your frontend domain(s)
- ✅ Use HTTPS in production
- ✅ Implement rate limiting (included in nginx.conf)

### Container Security
- ✅ Run containers as non-root user (configured in Dockerfile)
- ✅ Use official base images
- ✅ Keep dependencies updated

## 📊 Monitoring and Maintenance

### Health Monitoring
Set up monitoring for the health check endpoint:
```bash
# Example with curl (add to cron job)
curl -f https://yourdomain.com/healthz || echo "Backend is down!"
```

### Log Management
Configure log rotation and monitoring:
```bash
# View recent logs
docker-compose -f docker-compose.production.yml logs --tail=100 connectorpro-backend

# Follow logs in real-time
docker-compose -f docker-compose.production.yml logs -f connectorpro-backend
```

### Database Monitoring
- Monitor MongoDB Atlas dashboard
- Set up alerts for connection issues
- Monitor database performance metrics

## 🔧 Troubleshooting

### Common Issues

1. **Database Connection Failed:**
   - Check MongoDB URI format
   - Verify network access in MongoDB Atlas
   - Ensure IP whitelist includes your server

2. **Google OAuth Issues:**
   - Verify client ID and secret
   - Check redirect URIs in Google Console
   - Ensure proper scopes are configured

3. **Container Won't Start:**
   - Check environment variables
   - Verify Docker image build
   - Check container logs

4. **Health Check Failing:**
   - Verify MongoDB connection
   - Check application logs
   - Ensure all required environment variables are set

### Debug Commands

```bash
# Check container status
docker-compose -f docker-compose.production.yml ps

# Inspect container
docker inspect connectorpro-backend-prod

# Execute commands in container
docker exec -it connectorpro-backend-prod /bin/bash

# Test database connection
docker exec -it connectorpro-backend-prod python -c "
import os
from motor.motor_asyncio import AsyncIOMotorClient
import asyncio

async def test_db():
    client = AsyncIOMotorClient(os.getenv('MONGODB_URI'))
    await client.admin.command('ping')
    print('✅ Database connection successful')

asyncio.run(test_db())
"
```

## 📈 Performance Optimization

### Resource Limits
The production Docker Compose file includes resource limits:
- Memory limit: 512MB
- Memory reservation: 256MB

Adjust based on your needs:
```yaml
deploy:
  resources:
    limits:
      memory: 1G
      cpus: '0.5'
    reservations:
      memory: 512M
```

### Scaling
To scale the backend:
```bash
docker-compose -f docker-compose.production.yml up -d --scale connectorpro-backend=3
```

## 🆘 Support

For deployment issues:
1. Check application logs
2. Verify health check endpoint
3. Test MongoDB Atlas connection
4. Review environment variable configuration
5. Run the verification script

## 📝 Deployment Checklist

- [ ] MongoDB Atlas cluster created and configured
- [ ] Google OAuth2 credentials obtained
- [ ] Domain name configured with DNS
- [ ] SSL certificates installed (for HTTPS)
- [ ] Environment variables configured in `.env`
- [ ] Docker image built successfully
- [ ] Health check endpoint responding
- [ ] API documentation accessible
- [ ] Monitoring and alerting configured
- [ ] Backup strategy implemented

---

**🎉 Congratulations!** Your ConnectorPro backend is now ready for production deployment.