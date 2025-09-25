#!/usr/bin/env python3

import sys
import os
import csv
import io
sys.path.append('python-backend')

from csv_service_simple import CSVService

def test_header_extraction():
    """Test header extraction and field mapping with the LinkedIn CSV format"""
    
    csv_file = 'June-2025-LinkedIn_Connections-test.csv'
    
    print("🔍 Testing LinkedIn CSV Header Extraction")
    print("=" * 60)
    
    # Read the test CSV file
    with open(csv_file, 'rb') as f:
        content = f.read()
    
    print(f"📁 File: {csv_file}")
    print(f"📊 File size: {len(content)} bytes")
    print()
    
    # Initialize CSV service
    csv_service = CSVService()
    
    # Test 1: Parse CSV content and extract headers
    print("🔧 Step 1: Raw Header Extraction")
    print("-" * 40)
    
    try:
        # Decode content to text
        text_content = content.decode('utf-8')
        csv_reader = csv.DictReader(io.StringIO(text_content))
        
        if csv_reader.fieldnames:
            print("✅ Original headers detected:")
            for i, header in enumerate(csv_reader.fieldnames, 1):
                print(f"   {i}. '{header}'")
        else:
            print("❌ No headers found!")
            return False
            
    except Exception as e:
        print(f"❌ Error reading CSV: {e}")
        return False
    
    print()
    
    # Test 2: Field mapping
    print("🗺️  Step 2: Field Mapping")
    print("-" * 40)
    
    if csv_reader.fieldnames:
        print("✅ Header mappings:")
        for header in csv_reader.fieldnames:
            normalized = csv_service.normalize_field_name(header)
            print(f"   '{header}' → '{normalized}'")
    
    print()
    
    # Test 3: Full CSV processing
    print("⚙️  Step 3: Full CSV Processing")
    print("-" * 40)
    
    contacts, total_rows, errors = csv_service.process_csv_file(content)
    
    print(f"📊 Processing Results:")
    print(f"   Total rows: {total_rows}")
    print(f"   Valid contacts: {len(contacts)}")
    print(f"   Errors: {len(errors)}")
    
    if errors:
        print(f"\n⚠️  Processing Errors:")
        for error in errors[:5]:  # Show first 5 errors
            print(f"   - {error}")
        if len(errors) > 5:
            print(f"   ... and {len(errors) - 5} more")
    
    print()
    
    # Test 4: Sample contact data
    print("👥 Step 4: Sample Contact Data")
    print("-" * 40)
    
    if contacts:
        print("✅ Successfully created contacts:")
        for i, contact in enumerate(contacts[:3], 1):  # Show first 3 contacts
            print(f"\n   Contact {i}:")
            print(f"     Name: {contact.name}")
            print(f"     Email: {contact.email or 'N/A'}")
            print(f"     Company: {contact.company or 'N/A'}")
            print(f"     Title: {contact.title or 'N/A'}")
            print(f"     LinkedIn: {contact.linkedinUrl or 'N/A'}")
            print(f"     Tags: {', '.join(contact.tags)}")
            if contact.notes:
                print(f"     Notes: {contact.notes}")
        
        if len(contacts) > 3:
            print(f"\n   ... and {len(contacts) - 3} more contacts")
    else:
        print("❌ No contacts were created!")
        return False
    
    print()
    
    # Test 5: Validation check
    print("✅ Step 5: Validation Summary")
    print("-" * 40)
    
    expected_headers = ['First Name', 'Last Name', 'URL', 'Email Address', 'Company', 'Position', 'Connected On']
    actual_headers = list(csv_reader.fieldnames) if csv_reader.fieldnames else []
    
    print("📋 Header Validation:")
    headers_match = set(expected_headers) == set(actual_headers)
    if headers_match:
        print("   ✅ Headers match expected LinkedIn format perfectly!")
    else:
        print("   ⚠️  Header differences found:")
        missing = set(expected_headers) - set(actual_headers)
        extra = set(actual_headers) - set(expected_headers)
        if missing:
            print(f"      Missing: {list(missing)}")
        if extra:
            print(f"      Extra: {list(extra)}")
    
    print(f"\n📈 Contact Creation:")
    if len(contacts) == total_rows:
        print("   ✅ All rows successfully converted to contacts!")
    else:
        print(f"   ⚠️  {total_rows - len(contacts)} rows failed to convert")
    
    print(f"\n🎯 Overall Result:")
    success = headers_match and len(contacts) > 0 and len(errors) == 0
    if success:
        print("   ✅ CSV processing test PASSED!")
    else:
        print("   ⚠️  CSV processing test had issues (see details above)")
    
    return success

if __name__ == "__main__":
    print("LinkedIn CSV Header Extraction Test")
    print("=" * 60)
    success = test_header_extraction()
    print("\n" + "=" * 60)
    if success:
        print("🎉 All tests PASSED! CSV processing is working correctly.")
    else:
        print("⚠️  Some tests failed. Check the details above.")
    print("=" * 60)