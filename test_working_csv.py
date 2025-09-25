#!/usr/bin/env python3

import sys
import os
sys.path.append('python-backend')

from csv_service_simple import CSVService

def test_working_csv():
    """Test the working CSV file"""
    
    filename = "LinkedIn_Connections_Working.csv"
    
    print("🔍 Testing LinkedIn_Connections_Working.csv")
    print("=" * 50)
    
    if not os.path.exists(filename):
        print(f"❌ File '{filename}' not found!")
        return False
    
    # Read and test the file
    with open(filename, 'rb') as f:
        content = f.read()
    
    print(f"📁 File: {filename}")
    print(f"📊 File size: {len(content)} bytes")
    
    # Initialize CSV service
    csv_service = CSVService()
    
    # Process the CSV
    contacts, total_rows, errors = csv_service.process_csv_file(content)
    
    print(f"\n📊 Processing Results:")
    print(f"   Total rows: {total_rows}")
    print(f"   Valid contacts: {len(contacts)}")
    print(f"   Errors: {len(errors)}")
    
    if errors:
        print(f"\n⚠️  Errors:")
        for error in errors:
            print(f"   - {error}")
    
    if contacts:
        print(f"\n👥 Sample Contacts:")
        for i, contact in enumerate(contacts[:3], 1):
            print(f"   {i}. {contact.name}")
            print(f"      Company: {contact.company or 'N/A'}")
            print(f"      LinkedIn: {contact.linkedinUrl or 'N/A'}")
            print(f"      Valid: {csv_service.is_valid_contact_row({'linkedinUrl': contact.linkedinUrl, 'email': contact.email, 'phone': getattr(contact, 'phone', '')})}")
    
    success = len(contacts) > 0 and len(errors) == 0
    
    print(f"\n🎯 Result: {'SUCCESS' if success else 'FAILED'}")
    
    return success

if __name__ == "__main__":
    success = test_working_csv()
    if success:
        print("\n✅ CSV file is ready for upload!")
    else:
        print("\n❌ CSV file has issues!")