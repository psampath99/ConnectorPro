#!/bin/bash

# ConnectorPro Backend Deployment Verification Script
# This script verifies that the backend deployment is working correctly

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKEND_URL=${BACKEND_URL:-"http://localhost:8000"}
TIMEOUT=${TIMEOUT:-30}

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

# Function to check if service is responding
check_service() {
    local url=$1
    local description=$2
    local expected_status=${3:-200}
    
    print_status "Checking $description..."
    
    if command -v curl &> /dev/null; then
        response=$(curl -s -o /dev/null -w "%{http_code}" --max-time $TIMEOUT "$url" || echo "000")
    else
        print_warning "curl not found, using wget..."
        if wget --timeout=$TIMEOUT --tries=1 -q --spider "$url" 2>/dev/null; then
            response="200"
        else
            response="000"
        fi
    fi
    
    if [ "$response" = "$expected_status" ]; then
        print_success "$description is responding (HTTP $response)"
        return 0
    else
        print_error "$description failed (HTTP $response)"
        return 1
    fi
}

# Function to check JSON response
check_json_endpoint() {
    local url=$1
    local description=$2
    local expected_field=$3
    
    print_status "Checking $description..."
    
    if command -v curl &> /dev/null; then
        response=$(curl -s --max-time $TIMEOUT "$url" 2>/dev/null || echo "{}")
    else
        print_warning "curl not found, skipping JSON validation for $description"
        return 0
    fi
    
    if echo "$response" | grep -q "$expected_field"; then
        print_success "$description is working correctly"
        return 0
    else
        print_error "$description returned unexpected response: $response"
        return 1
    fi
}

echo "🔍 ConnectorPro Backend Deployment Verification"
echo "=============================================="
echo "Backend URL: $BACKEND_URL"
echo "Timeout: ${TIMEOUT}s"
echo ""

# Test counter
tests_passed=0
tests_total=0

# Test 1: Health check endpoint
tests_total=$((tests_total + 1))
if check_json_endpoint "$BACKEND_URL/healthz" "Health check endpoint" "status"; then
    tests_passed=$((tests_passed + 1))
fi

# Test 2: Root endpoint
tests_total=$((tests_total + 1))
if check_json_endpoint "$BACKEND_URL/" "Root endpoint" "message"; then
    tests_passed=$((tests_passed + 1))
fi

# Test 3: API v1 root
tests_total=$((tests_total + 1))
if check_json_endpoint "$BACKEND_URL/api/v1" "API v1 root" "version"; then
    tests_passed=$((tests_passed + 1))
fi

# Test 4: OpenAPI docs
tests_total=$((tests_total + 1))
if check_service "$BACKEND_URL/docs" "OpenAPI documentation"; then
    tests_passed=$((tests_passed + 1))
fi

# Test 5: Contact stats endpoint (should work without auth in demo mode)
tests_total=$((tests_total + 1))
if check_service "$BACKEND_URL/api/v1/contacts/stats" "Contact stats endpoint"; then
    tests_passed=$((tests_passed + 1))
fi

# Test 6: LinkedIn status endpoint
tests_total=$((tests_total + 1))
if check_json_endpoint "$BACKEND_URL/api/v1/linkedin/rapidapi/status" "LinkedIn status endpoint" "status"; then
    tests_passed=$((tests_passed + 1))
fi

echo ""
echo "=============================================="
echo "📊 Test Results: $tests_passed/$tests_total tests passed"

if [ $tests_passed -eq $tests_total ]; then
    print_success "All deployment verification tests passed! 🎉"
    echo ""
    echo "✅ Your ConnectorPro backend is ready for production!"
    echo ""
    echo "🔗 Available endpoints:"
    echo "   • Health check: $BACKEND_URL/healthz"
    echo "   • API documentation: $BACKEND_URL/docs"
    echo "   • API root: $BACKEND_URL/api/v1"
    echo ""
    exit 0
else
    failed_tests=$((tests_total - tests_passed))
    print_error "$failed_tests test(s) failed!"
    echo ""
    echo "❌ Please check the backend configuration and try again."
    echo ""
    echo "🔧 Troubleshooting tips:"
    echo "   • Ensure the backend is running on $BACKEND_URL"
    echo "   • Check Docker container logs: docker logs connectorpro-backend-prod"
    echo "   • Verify environment variables in .env.production"
    echo "   • Check MongoDB connection string"
    echo ""
    exit 1
fi