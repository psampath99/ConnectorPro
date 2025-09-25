#!/usr/bin/env python3

import sys
import os
sys.path.append('python-backend')

from csv_service_simple import CSVService

def test_linkedin_csv_requirements():
    """Test all LinkedIn CSV requirements"""
    
    print("🔍 Testing Enhanced LinkedIn CSV Importer")
    print("=" * 60)
    
    # Test 1: Create a test CSV with LinkedIn format
    test_csv_content = """First Name,Last Name,URL,Email Address,Company,Position,Connected On
John,Smith,https://linkedin.com/in/johnsmith,john.smith@example.com,Tech Corp,Software Engineer,25 Jun 2023
Jane,Doe,https://linkedin.com/in/janedoe,,Design Studio,UX Designer,24 Jun 2023
Mike,Johnson,https://linkedin.com/in/mikejohnson,mike@company.com,Marketing Inc,Marketing Manager,23 Jun 2023
Sarah,,https://linkedin.com/in/sarah,,Startup Co,Founder,22 Jun 2023
,Wilson,https://linkedin.com/in/wilson,wilson@email.com,Consulting,Consultant,21 Jun 2023"""
    
    print("📝 Test CSV Content:")
    print("   - John Smith (with email)")
    print("   - Jane Doe (NO email)")
    print("   - Mike Johnson (with email)")
    print("   - Sarah [no last name] (should be rejected)")
    print("   - [no first name] Wilson (should be rejected)")
    print()
    
    # Initialize CSV service
    csv_service = CSVService()
    
    # Test processing
    contacts, total_rows, errors = csv_service.process_csv_file(test_csv_content.encode('utf-8'))
    
    print("📊 Processing Results:")
    print(f"   Total rows: {total_rows}")
    print(f"   Valid contacts: {len(contacts)}")
    print(f"   Errors: {len(errors)}")
    print()
    
    # Test 2: Verify field mappings
    print("🗺️  Field Mapping Test:")
    test_headers = ['First Name', 'Last Name', 'Email Address', 'Company', 'Position', 'URL']
    for header in test_headers:
        mapped = csv_service.normalize_field_name(header)
        print(f"   '{header}' → '{mapped}'")
    print()
    
    # Test 3: Verify contacts created
    print("👥 Created Contacts:")
    expected_valid = ['John Smith', 'Jane Doe', 'Mike Johnson']  # Sarah and Wilson should be rejected
    
    for i, contact in enumerate(contacts, 1):
        print(f"   {i}. {contact.name}")
        print(f"      Email: {contact.email or 'MISSING (marked in notes)'}")
        print(f"      Company: {contact.company or 'N/A'}")
        print(f"      LinkedIn: {contact.linkedinUrl or 'N/A'}")
        if 'Email missing' in (contact.notes or ''):
            print(f"      ✅ Correctly marked email as missing")
        print()
    
    # Test 4: Verify validation logic
    print("✅ Validation Tests:")
    
    # Test valid rows
    valid_row = {'first_name': 'John', 'last_name': 'Smith', 'email': ''}
    is_valid = csv_service.is_valid_contact_row(valid_row)
    print(f"   Row with First+Last name (no email): {'VALID' if is_valid else 'INVALID'}")
    
    # Test invalid rows
    invalid_row1 = {'first_name': 'John', 'last_name': '', 'email': 'john@email.com'}
    is_invalid1 = csv_service.is_valid_contact_row(invalid_row1)
    print(f"   Row with only First name: {'VALID' if is_invalid1 else 'INVALID (correct)'}")
    
    invalid_row2 = {'first_name': '', 'last_name': 'Smith', 'email': 'smith@email.com'}
    is_invalid2 = csv_service.is_valid_contact_row(invalid_row2)
    print(f"   Row with only Last name: {'VALID' if is_invalid2 else 'INVALID (correct)'}")
    print()
    
    # Test 5: Error messaging
    if errors:
        print("⚠️  Error Messages:")
        for error in errors:
            print(f"   - {error}")
        print()
    
    # Test 6: Summary validation
    print("🎯 Requirements Validation:")
    
    # Check field mapping
    email_mapped = csv_service.normalize_field_name('Email Address') == 'email'
    first_mapped = csv_service.normalize_field_name('First Name') == 'first_name'
    last_mapped = csv_service.normalize_field_name('Last Name') == 'last_name'
    
    print(f"   ✅ Email Address → email: {'PASS' if email_mapped else 'FAIL'}")
    print(f"   ✅ First Name → first_name: {'PASS' if first_mapped else 'FAIL'}")
    print(f"   ✅ Last Name → last_name: {'PASS' if last_mapped else 'FAIL'}")
    
    # Check validation logic
    valid_contacts_count = len([c for c in contacts if c.name in expected_valid])
    validation_correct = valid_contacts_count == 3  # Should have John, Jane, Mike
    print(f"   ✅ First+Last name validation: {'PASS' if validation_correct else 'FAIL'}")
    
    # Check missing email handling
    missing_email_contacts = [c for c in contacts if not c.email and 'Email missing' in (c.notes or '')]
    email_handling = len(missing_email_contacts) > 0
    print(f"   ✅ Missing email handling: {'PASS' if email_handling else 'FAIL'}")
    
    # Check flexible header matching (case insensitive)
    case_test = csv_service.normalize_field_name('FIRST NAME') == 'first_name'
    space_test = csv_service.normalize_field_name('first_name') == 'first_name'
    print(f"   ✅ Flexible header matching: {'PASS' if case_test and space_test else 'FAIL'}")
    
    print()
    
    # Overall result
    all_tests_pass = (
        email_mapped and first_mapped and last_mapped and 
        validation_correct and email_handling and case_test and space_test
    )
    
    print("🏆 Overall Result:")
    if all_tests_pass:
        print("   ✅ ALL REQUIREMENTS PASSED!")
        print("   🎉 LinkedIn CSV importer is working correctly!")
    else:
        print("   ❌ Some requirements failed - check details above")
    
    return all_tests_pass

if __name__ == "__main__":
    success = test_linkedin_csv_requirements()
    print("\n" + "=" * 60)
    if success:
        print("🎉 LinkedIn CSV importer test PASSED!")
    else:
        print("❌ LinkedIn CSV importer test FAILED!")
    print("=" * 60)