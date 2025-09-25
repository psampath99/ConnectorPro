#!/usr/bin/env python3

import sys
import csv
import io

def test_csv_file(file_path):
    """Test a CSV file to see if it's properly formatted"""
    
    print(f"🔍 Testing CSV file: {file_path}")
    print("=" * 50)
    
    try:
        with open(file_path, 'rb') as f:
            content = f.read()
        
        print(f"📁 File size: {len(content)} bytes")
        
        # Try to decode
        try:
            text_content = content.decode('utf-8')
        except UnicodeDecodeError:
            try:
                text_content = content.decode('utf-8-sig')  # Handle BOM
            except UnicodeDecodeError:
                try:
                    text_content = content.decode('latin-1')
                except UnicodeDecodeError:
                    text_content = content.decode('cp1252')
        
        print(f"📝 First 200 characters:")
        print(repr(text_content[:200]))
        print()
        
        # Parse CSV
        csv_reader = csv.reader(io.StringIO(text_content))
        rows = list(csv_reader)
        
        if not rows:
            print("❌ No rows found in CSV")
            return False
        
        headers = rows[0]
        print(f"📋 Headers ({len(headers)}): {headers}")
        print()
        
        if len(rows) > 1:
            print(f"📊 Sample data rows:")
            for i, row in enumerate(rows[1:6], 1):  # Show first 5 data rows
                print(f"   Row {i}: {row}")
            if len(rows) > 6:
                print(f"   ... and {len(rows) - 6} more rows")
        
        print()
        print(f"✅ CSV appears to be valid!")
        print(f"   - Total rows: {len(rows)}")
        print(f"   - Data rows: {len(rows) - 1}")
        print(f"   - Columns: {len(headers)}")
        
        # Check for LinkedIn format
        linkedin_headers = ['first name', 'last name', 'email address', 'url', 'company', 'position']
        found_headers = [h.lower() for h in headers]
        
        linkedin_matches = sum(1 for h in linkedin_headers if h in found_headers)
        print(f"   - LinkedIn format match: {linkedin_matches}/{len(linkedin_headers)} headers")
        
        if linkedin_matches >= 3:
            print("   🎉 Looks like a LinkedIn CSV format!")
        else:
            print("   ⚠️  May not be LinkedIn format - check headers")
        
        return True
        
    except Exception as e:
        print(f"❌ Error reading CSV file: {e}")
        return False

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python3 test_your_csv.py <csv_file_path>")
        print("\nExample:")
        print("  python3 test_your_csv.py Connections.csv")
        print("  python3 test_your_csv.py /path/to/your/linkedin_connections.csv")
        sys.exit(1)
    
    file_path = sys.argv[1]
    success = test_csv_file(file_path)
    
    print("\n" + "=" * 50)
    if success:
        print("✅ CSV file test PASSED!")
        print("💡 This file should work with the ConnectorPro backend")
    else:
        print("❌ CSV file test FAILED!")
        print("💡 This file may have issues - check the format")
    print("=" * 50)