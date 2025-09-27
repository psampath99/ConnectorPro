#!/usr/bin/env python3
"""
Basic HTTP server for testing the /contacts endpoint
Uses only Python standard library - no external dependencies
"""

import json
import http.server
import socketserver
from urllib.parse import urlparse, parse_qs
from datetime import datetime

class ContactsHandler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        """Handle GET requests"""
        parsed_path = urlparse(self.path)
        path = parsed_path.path
        
        # Set CORS headers
        self.send_cors_headers()
        
        if path == '/':
            self.send_root_response()
        elif path == '/healthz':
            self.send_health_response()
        elif path == '/contacts':
            self.send_contacts_response()
        else:
            self.send_404_response()
    
    def do_OPTIONS(self):
        """Handle OPTIONS requests for CORS"""
        self.send_cors_headers()
        self.end_headers()
    
    def send_cors_headers(self):
        """Send CORS headers"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        self.send_header('Content-Type', 'application/json')
    
    def send_root_response(self):
        """Send root endpoint response"""
        response = {
            "message": "ConnectorPro Basic Test Server",
            "version": "1.0.0",
            "endpoints": ["/contacts", "/healthz"]
        }
        self.end_headers()
        self.wfile.write(json.dumps(response, indent=2).encode())
    
    def send_health_response(self):
        """Send health check response"""
        response = {
            "status": "ok",
            "message": "Service is healthy"
        }
        self.end_headers()
        self.wfile.write(json.dumps(response, indent=2).encode())
    
    def send_contacts_response(self):
        """Send contacts endpoint response - Step #2 for assistant"""
        # Mock contacts data representing parsed CSV data
        mock_contacts = [
            {
                "id": "1",
                "name": "John Smith",
                "title": "Software Engineer",
                "company": "Tech Corp",
                "email": "john.smith@techcorp.com",
                "phone": "+1-555-0123",
                "linkedinUrl": "https://linkedin.com/in/johnsmith",
                "degree": 1,
                "relationshipStrength": "medium",
                "notes": "Met at tech conference",
                "tags": ["csv-import", "tech"],
                "addedAt": "2024-01-15T10:30:00Z",
                "createdAt": "2024-01-15T10:30:00Z",
                "updatedAt": "2024-01-15T10:30:00Z"
            },
            {
                "id": "2",
                "name": "Sarah Johnson",
                "title": "Product Manager",
                "company": "Innovation Inc",
                "email": "sarah.johnson@innovation.com",
                "phone": "+1-555-0456",
                "linkedinUrl": "https://linkedin.com/in/sarahjohnson",
                "degree": 1,
                "relationshipStrength": "strong",
                "notes": "Former colleague",
                "tags": ["csv-import", "product"],
                "addedAt": "2024-01-16T14:20:00Z",
                "createdAt": "2024-01-16T14:20:00Z",
                "updatedAt": "2024-01-16T14:20:00Z"
            },
            {
                "id": "3",
                "name": "Mike Chen",
                "title": "Data Scientist",
                "company": "Analytics Pro",
                "email": "mike.chen@analyticspro.com",
                "phone": "+1-555-0789",
                "linkedinUrl": "https://linkedin.com/in/mikechen",
                "degree": 1,
                "relationshipStrength": "weak",
                "notes": "LinkedIn connection",
                "tags": ["csv-import", "data"],
                "addedAt": "2024-01-17T09:15:00Z",
                "createdAt": "2024-01-17T09:15:00Z",
                "updatedAt": "2024-01-17T09:15:00Z"
            },
            {
                "id": "4",
                "name": "Emily Davis",
                "title": "UX Designer",
                "company": "Design Studio",
                "email": "emily.davis@designstudio.com",
                "phone": "+1-555-0321",
                "linkedinUrl": "https://linkedin.com/in/emilydavis",
                "degree": 1,
                "relationshipStrength": "medium",
                "notes": "Collaborated on project",
                "tags": ["csv-import", "design"],
                "addedAt": "2024-01-18T16:45:00Z",
                "createdAt": "2024-01-18T16:45:00Z",
                "updatedAt": "2024-01-18T16:45:00Z"
            },
            {
                "id": "5",
                "name": "Alex Rodriguez",
                "title": "Marketing Director",
                "company": "Growth Co",
                "email": "alex.rodriguez@growthco.com",
                "phone": "+1-555-0654",
                "linkedinUrl": "https://linkedin.com/in/alexrodriguez",
                "degree": 1,
                "relationshipStrength": "strong",
                "notes": "Business partner",
                "tags": ["csv-import", "marketing"],
                "addedAt": "2024-01-19T11:30:00Z",
                "createdAt": "2024-01-19T11:30:00Z",
                "updatedAt": "2024-01-19T11:30:00Z"
            }
        ]
        
        response = {
            "success": True,
            "contacts": mock_contacts,
            "total": len(mock_contacts),
            "message": f"Retrieved {len(mock_contacts)} contacts from CSV imports",
            "source": "mock_data",
            "timestamp": datetime.now().isoformat()
        }
        
        self.end_headers()
        self.wfile.write(json.dumps(response, indent=2).encode())
    
    def send_404_response(self):
        """Send 404 response"""
        self.send_response(404)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        response = {
            "error": "Not Found",
            "message": f"Endpoint {self.path} not found",
            "available_endpoints": ["/", "/healthz", "/contacts"]
        }
        self.wfile.write(json.dumps(response, indent=2).encode())

def run_server(port=8000):
    """Run the basic HTTP server"""
    with socketserver.TCPServer(("", port), ContactsHandler) as httpd:
        print(f"✅ Basic HTTP server running on http://localhost:{port}")
        print(f"📋 Test the /contacts endpoint: http://localhost:{port}/contacts")
        print(f"🏥 Health check: http://localhost:{port}/healthz")
        print("Press Ctrl+C to stop the server")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n🛑 Server stopped")

if __name__ == "__main__":
    run_server()