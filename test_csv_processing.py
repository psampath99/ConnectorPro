#!/usr/bin/env python3

import sys
import os
sys.path.append('python-backend')

from csv_service_simple import CSVService
from models import Contact

def test_csv_processing():
    """Test CSV processing with the LinkedIn format"""
    
    # Read the test CSV file
    with open('test_linkedin_connections.csv', 'rb') as f:
        content = f.read()
    
    # Initialize CSV service
    csv_service = CSVService()
    
    print("🔍 Testing CSV Processing...")
    print("=" * 50)
    
    # Process the CSV
    contacts, total_rows, errors = csv_service.process_csv_file(content)
    
    print(f"📊 Results:")
    print(f"   Total rows processed: {total_rows}")
    print(f"   Valid contacts created: {len(contacts)}")
    print(f"   Errors: {len(errors)}")
    
    if errors:
        print(f"\n⚠️  Errors:")
        for error in errors:
            print(f"   - {error}")
    
    print(f"\n👥 Contacts Created:")
    print("-" * 50)
    
    for i, contact in enumerate(contacts, 1):
        print(f"{i}. {contact.name}")
        print(f"   Email: {contact.email or 'N/A'}")
        print(f"   Company: {contact.company or 'N/A'}")
        print(f"   Title: {contact.title or 'N/A'}")
        print(f"   LinkedIn: {contact.linkedinUrl or 'N/A'}")
        print(f"   Tags: {', '.join(contact.tags)}")
        if contact.notes:
            print(f"   Notes: {contact.notes}")
        print()
    
    # Test field mapping
    print("🔧 Field Mapping Test:")
    print("-" * 30)
    
    # Parse just the content to see field mapping
    rows, parse_errors = csv_service.parse_csv_content(content)
    if rows:
        sample_row = rows[0]
        print("Original headers detected and mapped:")
        for key, value in sample_row.items():
            if value:  # Only show fields with data
                print(f"   {key}: '{value}'")
    
    return len(contacts) > 0

if __name__ == "__main__":
    success = test_csv_processing()
    if success:
        print("✅ CSV processing test PASSED!")
    else:
        print("❌ CSV processing test FAILED!")
        sys.exit(1)