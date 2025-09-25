#!/usr/bin/env python3

import csv
import sys

def extract_csv_headers(filename):
    """Extract and display headers from a CSV file"""
    
    print(f"📁 Extracting headers from: {filename}")
    print("=" * 50)
    
    try:
        with open(filename, 'r', encoding='utf-8') as file:
            # Read first line to get headers
            csv_reader = csv.reader(file)
            headers = next(csv_reader, None)
            
            if headers:
                print("✅ Headers found:")
                for i, header in enumerate(headers, 1):
                    print(f"   {i}. '{header}'")
                
                print(f"\n📊 Total columns: {len(headers)}")
                
                # Show field mappings that our system would use
                print(f"\n🗺️  Field Mappings (what our system would extract):")
                
                # Import our CSV service to show mappings
                sys.path.append('python-backend')
                from csv_service_simple import CSVService
                
                csv_service = CSVService()
                for header in headers:
                    normalized = csv_service.normalize_field_name(header)
                    print(f"   '{header}' → '{normalized}'")
                
                return headers
            else:
                print("❌ No headers found in the file!")
                return None
                
    except FileNotFoundError:
        print(f"❌ File '{filename}' not found!")
        return None
    except Exception as e:
        print(f"❌ Error reading file: {e}")
        return None

if __name__ == "__main__":
    filename = "June-2025-LinkedIn_Connections-test.csv"
    headers = extract_csv_headers(filename)
    
    if headers:
        print("\n" + "=" * 50)
        print("🎯 Expected LinkedIn CSV Headers:")
        expected = ['First Name', 'Last Name', 'URL', 'Email Address', 'Company', 'Position', 'Connected On']
        for i, header in enumerate(expected, 1):
            print(f"   {i}. '{header}'")
        
        print(f"\n✅ Header Match: {'YES' if set(headers) == set(expected) else 'NO'}")
        
        if set(headers) != set(expected):
            missing = set(expected) - set(headers)
            extra = set(headers) - set(expected)
            if missing:
                print(f"   Missing: {list(missing)}")
            if extra:
                print(f"   Extra: {list(extra)}")