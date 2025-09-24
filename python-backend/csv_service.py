import csv
import io
import pandas as pd
from typing import List, Dict, Any, Tuple
from models import Contact, ContactDegree, RelationshipStrength
from datetime import datetime
import logging
import re

logger = logging.getLogger(__name__)

class CSVService:
    def __init__(self):
        # Common field mappings for LinkedIn CSV exports
        self.field_mappings = {
            # LinkedIn standard fields
            'first name': 'first_name',
            'last name': 'last_name',
            'email address': 'email',
            'company': 'company',
            'position': 'title',
            'connected on': 'connected_on',
            'profile url': 'linkedinUrl',
            'url': 'linkedinUrl',
            
            # Alternative field names
            'name': 'name',
            'full name': 'name',
            'job title': 'title',
            'title': 'title',
            'organization': 'company',
            'employer': 'company',
            'linkedin': 'linkedinUrl',
            'linkedin url': 'linkedinUrl',
            'linkedin profile': 'linkedinUrl',
            'phone': 'phone',
            'phone number': 'phone',
            'notes': 'notes',
        }
    
    def normalize_field_name(self, field_name: str) -> str:
        """Normalize field names to match our mappings"""
        normalized = field_name.lower().strip()
        return self.field_mappings.get(normalized, normalized.replace(' ', '_'))
    
    def parse_csv_content(self, content: bytes) -> Tuple[List[Dict[str, Any]], List[str]]:
        """Parse CSV content and return rows and any errors"""
        errors = []
        rows = []
        
        try:
            # Try to decode as UTF-8 first, then fall back to other encodings
            try:
                text_content = content.decode('utf-8')
            except UnicodeDecodeError:
                try:
                    text_content = content.decode('utf-8-sig')  # Handle BOM
                except UnicodeDecodeError:
                    text_content = content.decode('latin-1')
            
            # Use pandas to handle various CSV formats
            try:
                df = pd.read_csv(io.StringIO(text_content))
                
                # Normalize column names
                df.columns = [self.normalize_field_name(col) for col in df.columns]
                
                # Convert to list of dictionaries
                rows = df.to_dict('records')
                
            except Exception as e:
                # Fall back to standard CSV reader
                logger.warning(f"Pandas failed, falling back to csv reader: {e}")
                csv_reader = csv.DictReader(io.StringIO(text_content))
                
                # Normalize field names
                if csv_reader.fieldnames:
                    normalized_fieldnames = [self.normalize_field_name(field) for field in csv_reader.fieldnames]
                    
                    for i, row in enumerate(csv_reader):
                        try:
                            normalized_row = {}
                            for old_key, new_key in zip(csv_reader.fieldnames, normalized_fieldnames):
                                normalized_row[new_key] = row[old_key]
                            rows.append(normalized_row)
                        except Exception as row_error:
                            errors.append(f"Error processing row {i+1}: {str(row_error)}")
                            continue
                
        except Exception as e:
            errors.append(f"Failed to parse CSV: {str(e)}")
            return [], errors
        
        return rows, errors
    
    def clean_phone_number(self, phone: str) -> str:
        """Clean and format phone number"""
        if not phone:
            return ""
        
        # Remove all non-digit characters except + at the beginning
        cleaned = re.sub(r'[^\d+]', '', str(phone))
        
        # If it starts with +, keep it, otherwise remove any leading +
        if cleaned.startswith('+'):
            return cleaned
        else:
            return cleaned.lstrip('+')
    
    def clean_linkedin_url(self, url: str) -> str:
        """Clean and validate LinkedIn URL"""
        if not url:
            return ""
        
        url = str(url).strip()
        
        # If it's just a username, construct the full URL
        if not url.startswith('http'):
            if '/' not in url:
                url = f"https://linkedin.com/in/{url}"
            else:
                url = f"https://linkedin.com/{url.lstrip('/')}"
        
        # Ensure it's a LinkedIn URL
        if 'linkedin.com' not in url.lower():
            return ""
        
        return url
    
    def parse_name(self, row: Dict[str, Any]) -> str:
        """Extract full name from row data"""
        # Try to get full name first
        if 'name' in row and row['name']:
            return str(row['name']).strip()
        
        # Combine first and last name
        first_name = str(row.get('first_name', '')).strip()
        last_name = str(row.get('last_name', '')).strip()
        
        if first_name and last_name:
            return f"{first_name} {last_name}"
        elif first_name:
            return first_name
        elif last_name:
            return last_name
        
        return ""
    
    def determine_relationship_strength(self, row: Dict[str, Any]) -> RelationshipStrength:
        """Determine relationship strength based on available data"""
        # This is a simple heuristic - can be made more sophisticated
        
        # If we have email, it's likely a stronger connection
        if row.get('email'):
            return RelationshipStrength.MEDIUM
        
        # If we have phone, it's likely a strong connection
        if row.get('phone'):
            return RelationshipStrength.STRONG
        
        # If we have notes, there's some interaction
        if row.get('notes'):
            return RelationshipStrength.MEDIUM
        
        # Default to weak for LinkedIn connections
        return RelationshipStrength.WEAK
    
    def row_to_contact(self, row: Dict[str, Any], row_index: int) -> Tuple[Contact, List[str]]:
        """Convert a CSV row to a Contact object"""
        errors = []
        
        try:
            # Extract and clean data
            name = self.parse_name(row)
            if not name:
                errors.append(f"Row {row_index}: Missing name")
                return None, errors
            
            email = str(row.get('email', '')).strip() if row.get('email') else ""
            company = str(row.get('company', '')).strip() if row.get('company') else ""
            title = str(row.get('title', '')).strip() if row.get('title') else ""
            phone = self.clean_phone_number(row.get('phone', ''))
            linkedin_url = self.clean_linkedin_url(row.get('linkedinUrl', ''))
            notes = str(row.get('notes', '')).strip() if row.get('notes') else ""
            
            # Determine relationship strength
            relationship_strength = self.determine_relationship_strength(row)
            
            # Create contact
            contact = Contact(
                name=name,
                email=email if email else None,
                company=company if company else None,
                title=title if title else None,
                phone=phone if phone else None,
                linkedinUrl=linkedin_url if linkedin_url else None,
                degree=ContactDegree.FIRST,  # Assume CSV imports are 1st degree
                relationshipStrength=relationship_strength,
                notes=notes,
                tags=["csv-import"],
                addedAt=datetime.now(),
                createdAt=datetime.now(),
                updatedAt=datetime.now()
            )
            
            return contact, errors
            
        except Exception as e:
            errors.append(f"Row {row_index}: Error creating contact - {str(e)}")
            return None, errors
    
    def process_csv_file(self, content: bytes) -> Tuple[List[Contact], int, List[str]]:
        """Process CSV file and return contacts, total rows, and errors"""
        # Parse CSV content
        rows, parse_errors = self.parse_csv_content(content)
        
        if not rows:
            return [], 0, parse_errors or ["No data found in CSV file"]
        
        contacts = []
        all_errors = parse_errors.copy()
        
        # Process each row
        for i, row in enumerate(rows, 1):
            contact, row_errors = self.row_to_contact(row, i)
            
            if contact:
                contacts.append(contact)
            
            all_errors.extend(row_errors)
        
        return contacts, len(rows), all_errors
    
    def validate_contacts(self, contacts: List[Contact]) -> Tuple[List[Contact], List[str]]:
        """Validate contacts and remove duplicates"""
        valid_contacts = []
        errors = []
        seen_emails = set()
        seen_linkedin_urls = set()
        
        for i, contact in enumerate(contacts):
            # Check for duplicate email
            if contact.email:
                if contact.email.lower() in seen_emails:
                    errors.append(f"Duplicate email found: {contact.email}")
                    continue
                seen_emails.add(contact.email.lower())
            
            # Check for duplicate LinkedIn URL
            if contact.linkedinUrl:
                if contact.linkedinUrl.lower() in seen_linkedin_urls:
                    errors.append(f"Duplicate LinkedIn URL found: {contact.linkedinUrl}")
                    continue
                seen_linkedin_urls.add(contact.linkedinUrl.lower())
            
            valid_contacts.append(contact)
        
        return valid_contacts, errors