#!/usr/bin/env python3

import csv
import sys
import os

def test_connections_csv():
    """Test the Connections.csv file to verify header extraction"""
    
    filename = "Connections.csv"
    
    print("🔍 Testing LinkedIn Connections.csv File")
    print("=" * 50)
    print(f"📁 File: {filename}")
    
    if not os.path.exists(filename):
        print(f"❌ File '{filename}' not found!")
        return False
    
    try:
        # Read and display headers
        with open(filename, 'r', encoding='utf-8') as file:
            csv_reader = csv.reader(file)
            headers = next(csv_reader, None)
            
            if headers:
                print(f"\n✅ Headers extracted successfully:")
                for i, header in enumerate(headers, 1):
                    print(f"   {i}. '{header}'")
                
                print(f"\n📊 Total columns: {len(headers)}")
                
                # Test with our CSV service
                sys.path.append('python-backend')
                from csv_service_simple import CSVService
                
                print(f"\n🗺️  Field Mappings (our system):")
                csv_service = CSVService()
                for header in headers:
                    normalized = csv_service.normalize_field_name(header)
                    print(f"   '{header}' → '{normalized}'")
                
                # Test full processing
                print(f"\n⚙️  Testing full CSV processing...")
                with open(filename, 'rb') as f:
                    content = f.read()
                
                contacts, total_rows, errors = csv_service.process_csv_file(content)
                
                print(f"   📊 Results:")
                print(f"      Total rows: {total_rows}")
                print(f"      Valid contacts: {len(contacts)}")
                print(f"      Errors: {len(errors)}")
                
                if errors:
                    print(f"\n   ⚠️  Errors:")
                    for error in errors:
                        print(f"      - {error}")
                
                if contacts:
                    print(f"\n   👥 Sample contacts created:")
                    for i, contact in enumerate(contacts[:2], 1):
                        print(f"      {i}. {contact.name}")
                        print(f"         Company: {contact.company or 'N/A'}")
                        print(f"         Title: {contact.title or 'N/A'}")
                        print(f"         LinkedIn: {contact.linkedinUrl or 'N/A'}")
                        print(f"         Email: {contact.email or 'N/A'}")
                
                # Validation
                expected_headers = ['First Name', 'Last Name', 'URL', 'Email Address', 'Company', 'Position', 'Connected On']
                headers_match = set(headers) == set(expected_headers)
                
                print(f"\n✅ Validation:")
                print(f"   Headers match LinkedIn format: {'YES' if headers_match else 'NO'}")
                print(f"   Contacts created successfully: {'YES' if len(contacts) > 0 else 'NO'}")
                print(f"   Processing errors: {'NO' if len(errors) == 0 else 'YES'}")
                
                return headers_match and len(contacts) > 0
            else:
                print("❌ No headers found!")
                return False
                
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    success = test_connections_csv()
    print("\n" + "=" * 50)
    if success:
        print("🎉 Connections.csv test PASSED!")
    else:
        print("❌ Connections.csv test FAILED!")
    print("=" * 50)