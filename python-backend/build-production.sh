#!/bin/bash

# ConnectorPro Backend Production Build Script
# This script prepares the backend for production deployment

set -e  # Exit on any error

echo "🚀 Building ConnectorPro Backend for Production..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first."
    echo "Visit: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    print_warning "Docker Compose not found. Trying 'docker compose'..."
    if ! docker compose version &> /dev/null; then
        print_error "Docker Compose is not available. Please install Docker Compose."
        exit 1
    else
        DOCKER_COMPOSE_CMD="docker compose"
    fi
else
    DOCKER_COMPOSE_CMD="docker-compose"
fi

print_status "Docker and Docker Compose are available"

# Create production directory structure
print_status "Creating production directory structure..."
mkdir -p production-build
mkdir -p production-build/logs

# Copy necessary files to production build
print_status "Copying application files..."
cp -r . production-build/
cd production-build

# Remove development files
print_status "Cleaning up development files..."
rm -rf __pycache__
rm -rf .pytest_cache
rm -rf *.pyc
rm -rf .env
rm -f build-production.sh

# Ensure .env.production exists
if [ ! -f .env.production ]; then
    print_error ".env.production file not found!"
    print_status "Creating template .env.production file..."
    cp .env.example .env.production
    print_warning "Please update .env.production with your production values before deployment"
fi

# Build Docker image
print_status "Building Docker image..."
docker build -t connectorpro-backend:latest .

if [ $? -eq 0 ]; then
    print_success "Docker image built successfully!"
else
    print_error "Failed to build Docker image"
    exit 1
fi

# Test the image
print_status "Testing Docker image..."
docker run --rm connectorpro-backend:latest python -c "import main; print('✅ Application imports successfully')"

if [ $? -eq 0 ]; then
    print_success "Docker image test passed!"
else
    print_error "Docker image test failed"
    exit 1
fi

# Create deployment package
print_status "Creating deployment package..."
cd ..
tar -czf connectorpro-backend-production.tar.gz production-build/

print_success "Production build completed successfully!"
echo ""
echo "📦 Deployment package created: connectorpro-backend-production.tar.gz"
echo ""
echo "🚀 To deploy:"
echo "1. Extract the package on your production server"
echo "2. Update .env.production with your production values"
echo "3. Run: $DOCKER_COMPOSE_CMD up -d"
echo ""
echo "🔍 To test locally:"
echo "1. cd production-build"
echo "2. Update .env.production with your values"
echo "3. Run: $DOCKER_COMPOSE_CMD up"
echo ""
print_success "Build process completed!"