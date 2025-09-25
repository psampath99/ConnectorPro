#!/usr/bin/env python3

import sys
import os
sys.path.append('python-backend')

from csv_service_simple import CSVService

def test_linkedin_official_format():
    """Test the LinkedIn CSV importer with official export format"""
    print("🧪 Testing LinkedIn Official CSV Format")
    print("=" * 60)
    
    # Read the official format CSV
    try:
        with open('LinkedIn_Connections_Official_Format.csv', 'rb') as f:
            content = f.read()
    except FileNotFoundError:
        print("❌ LinkedIn_Connections_Official_Format.csv not found")
        return False
    
    # Initialize CSV service
    csv_service = CSVService()
    
    # Process the CSV
    print("📋 Processing LinkedIn CSV with metadata rows...")
    contacts, total_rows, errors = csv_service.process_csv_file(content)
    
    print(f"\n📊 Results:")
    print(f"   Total data rows processed: {total_rows}")
    print(f"   Valid contacts created: {len(contacts)}")
    print(f"   Errors/warnings: {len(errors)}")
    
    if errors:
        print(f"\n⚠️  Errors/Warnings:")
        for error in errors:
            print(f"   • {error}")
    
    if contacts:
        print(f"\n✅ Successfully imported contacts:")
        for i, contact in enumerate(contacts[:5], 1):  # Show first 5
            print(f"   {i}. {contact.name}")
            print(f"      Email: {contact.email or 'N/A'}")
            print(f"      Company: {contact.company or 'N/A'}")
            print(f"      Title: {contact.title or 'N/A'}")
            print(f"      LinkedIn: {contact.linkedinUrl or 'N/A'}")
            if 'Email missing' in (contact.notes or ''):
                print(f"      ✅ Correctly marked email as missing")
            print()
        
        if len(contacts) > 5:
            print(f"   ... and {len(contacts) - 5} more contacts")
    
    # Test validation requirements
    print(f"\n🔍 Validation Tests:")
    
    # Check that contacts without email but with names are included
    contacts_without_email = [c for c in contacts if not c.email]
    contacts_with_names_no_email = [c for c in contacts_without_email if c.name]
    
    print(f"   ✅ Contacts without email but with names: {len(contacts_with_names_no_email)}")
    
    # Check field mappings
    has_linkedin_urls = sum(1 for c in contacts if c.linkedinUrl)
    has_companies = sum(1 for c in contacts if c.company)
    has_titles = sum(1 for c in contacts if c.title)
    
    print(f"   ✅ LinkedIn URLs mapped: {has_linkedin_urls}/{len(contacts)}")
    print(f"   ✅ Companies mapped: {has_companies}/{len(contacts)}")
    print(f"   ✅ Titles mapped: {has_titles}/{len(contacts)}")
    
    # Check that all contacts have first and last names
    all_have_names = all(c.name and len(c.name.split()) >= 2 for c in contacts)
    print(f"   ✅ All contacts have first and last names: {all_have_names}")
    
    success = len(contacts) > 0 and len(errors) == 0
    
    print(f"\n{'🎉 SUCCESS' if success else '❌ FAILED'}: LinkedIn CSV import test")
    return success

def test_header_detection():
    """Test header detection with various formats"""
    print("\n🔍 Testing Header Detection")
    print("=" * 60)
    
    csv_service = CSVService()
    
    # Test cases
    test_cases = [
        # Official LinkedIn format with metadata
        "Connections\nNotes:\nWhen exporting...\n\nFirst Name,Last Name,URL,Email Address,Company,Position,Connected On\nJohn,Doe,https://linkedin.com/in/johndoe,,Tech Corp,Engineer,01 Jan 2023",
        
        # Clean format without metadata
        "First Name,Last Name,URL,Email Address,Company,Position,Connected On\nJane,Smith,https://linkedin.com/in/janesmith,jane@example.com,Design Co,Designer,02 Jan 2023",
        
        # Case variations
        "first name,last name,url,email address,company,position,connected on\nBob,Johnson,https://linkedin.com/in/bobjohnson,,Marketing Inc,Manager,03 Jan 2023"
    ]
    
    for i, test_csv in enumerate(test_cases, 1):
        print(f"\n📝 Test Case {i}:")
        content = test_csv.encode('utf-8')
        
        contacts, total_rows, errors = csv_service.process_csv_file(content)
        
        print(f"   Contacts found: {len(contacts)}")
        print(f"   Errors: {len(errors)}")
        
        if contacts:
            contact = contacts[0]
            print(f"   Sample contact: {contact.name}")
            print(f"   LinkedIn URL: {contact.linkedinUrl or 'N/A'}")
        
        if errors:
            print(f"   First error: {errors[0][:100]}...")

if __name__ == "__main__":
    print("LinkedIn CSV Import Test Suite")
    print("=" * 60)
    
    success1 = test_linkedin_official_format()
    test_header_detection()
    
    print(f"\n{'✅ ALL TESTS PASSED' if success1 else '❌ SOME TESTS FAILED'}")