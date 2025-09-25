import csv
import io
import asyncio
from typing import List, Dict, Any, Tuple, Optional
from models import Contact, ContactDegree, RelationshipStrength
from datetime import datetime
import logging
import re
import time

logger = logging.getLogger(__name__)

class CSVService:
    def __init__(self):
        # Enhanced field mappings for LinkedIn CSV exports and other formats
        self.field_mappings = {
            # Name fields - comprehensive variations
            'first name': 'first_name',
            'first_name': 'first_name',
            'firstname': 'first_name',
            'fname': 'first_name',
            'given name': 'first_name',
            'given_name': 'first_name',
            'givenname': 'first_name',
            
            'last name': 'last_name',
            'last_name': 'last_name',
            'lastname': 'last_name',
            'lname': 'last_name',
            'surname': 'last_name',
            'family name': 'last_name',
            'family_name': 'last_name',
            'familyname': 'last_name',
            
            'name': 'name',
            'full name': 'name',
            'full_name': 'name',
            'fullname': 'name',
            'contact name': 'name',
            'contact_name': 'name',
            'contactname': 'name',
            
            # Email fields - comprehensive variations
            'email': 'email',
            'email address': 'email',
            'email_address': 'email',
            'emailaddress': 'email',
            'e-mail': 'email',
            'e_mail': 'email',
            'e mail': 'email',
            'mail': 'email',
            'contact email': 'email',
            'contact_email': 'email',
            'contactemail': 'email',
            
            # Phone fields - comprehensive variations
            'phone': 'phone',
            'phone number': 'phone',
            'phone_number': 'phone',
            'phonenumber': 'phone',
            'mobile': 'phone',
            'mobile number': 'phone',
            'mobile_number': 'phone',
            'mobilenumber': 'phone',
            'cell': 'phone',
            'cell phone': 'phone',
            'cell_phone': 'phone',
            'cellphone': 'phone',
            'telephone': 'phone',
            'tel': 'phone',
            'contact phone': 'phone',
            'contact_phone': 'phone',
            'contactphone': 'phone',
            
            # Company fields - comprehensive variations
            'company': 'company',
            'organization': 'company',
            'organisation': 'company',
            'employer': 'company',
            'workplace': 'company',
            'work place': 'company',
            'business': 'company',
            'firm': 'company',
            'corp': 'company',
            'corporation': 'company',
            
            # Title/Position fields - comprehensive variations (LinkedIn uses 'Position' -> 'title')
            'title': 'title',
            'position': 'title',
            'job title': 'title',
            'job_title': 'title',
            'jobtitle': 'title',
            'role': 'title',
            'designation': 'title',
            'job': 'title',
            'occupation': 'title',
            'work title': 'title',
            'work_title': 'title',
            'worktitle': 'title',
            
            # LinkedIn specific fields - comprehensive variations
            'url': 'profile_url',
            'profile url': 'profile_url',
            'profile_url': 'profile_url',
            'profileurl': 'profile_url',
            'linkedin': 'profile_url',
            'linkedin url': 'profile_url',
            'linkedin_url': 'profile_url',
            'linkedinurl': 'profile_url',
            'linkedin profile': 'profile_url',
            'linkedin_profile': 'profile_url',
            'linkedinprofile': 'profile_url',
            'profile': 'profile_url',
            'link': 'profile_url',
            'connected on': 'connected_on',
            'connected_on': 'connected_on',
            'connectedon': 'connected_on',
            'connection date': 'connected_on',
            'connection_date': 'connected_on',
            'connectiondate': 'connected_on',
            'date connected': 'connected_on',
            'date_connected': 'connected_on',
            'dateconnected': 'connected_on',
            
            # Other fields
            'notes': 'notes',
            'comments': 'notes',
            'description': 'notes',
            'note': 'notes',
            'comment': 'notes',
        }
    
    def normalize_field_name(self, field_name: str) -> str:
        """Normalize field names to match our mappings with enhanced flexibility"""
        if not field_name or not isinstance(field_name, str):
            return ""
        
        # Clean and normalize the field name
        normalized = field_name.lower().strip()
        
        # Remove common punctuation and normalize separators
        normalized = normalized.replace('-', ' ').replace('_', ' ').replace('.', ' ')
        normalized = ' '.join(normalized.split())  # Normalize whitespace
        
        # Try exact match first
        if normalized in self.field_mappings:
            return self.field_mappings[normalized]
        
        # Try without spaces
        no_spaces = normalized.replace(' ', '')
        if no_spaces in self.field_mappings:
            return self.field_mappings[no_spaces]
        
        # Try with underscores
        with_underscores = normalized.replace(' ', '_')
        if with_underscores in self.field_mappings:
            return self.field_mappings[with_underscores]
        
        # If no mapping found, return a clean version
        return with_underscores if with_underscores else normalized
    
    def find_header_row(self, lines: List[str], delimiter: str) -> Tuple[int, List[str]]:
        """Find the actual header row in LinkedIn CSV, skipping metadata rows"""
        linkedin_expected_headers = [
            'first name', 'last name', 'url', 'email address',
            'company', 'position', 'connected on'
        ]
        
        for i, line in enumerate(lines):
            if not line.strip():
                continue
                
            try:
                # Parse the line as CSV
                reader = csv.reader([line], delimiter=delimiter)
                row = next(reader, [])
                
                if not row:
                    continue
                
                # Clean and normalize headers for comparison
                cleaned_headers = [h.lower().strip() for h in row if h.strip()]
                
                # Check if this looks like a LinkedIn header row
                # Must have at least First Name, Last Name, and URL
                required_headers = ['first name', 'last name', 'url']
                has_required = all(
                    any(req in header for header in cleaned_headers)
                    for req in required_headers
                )
                
                # Also check for typical LinkedIn header pattern
                has_linkedin_pattern = (
                    len(cleaned_headers) >= 5 and  # At least 5 columns
                    any('first' in h and 'name' in h for h in cleaned_headers) and
                    any('last' in h and 'name' in h for h in cleaned_headers) and
                    any('url' in h or 'profile' in h for h in cleaned_headers)
                )
                
                if has_required or has_linkedin_pattern:
                    logger.info(f"Found header row at line {i+1}: {row}")
                    return i, row
                    
            except Exception as e:
                continue
        
        # If no clear header found, return the first non-empty row
        for i, line in enumerate(lines):
            if line.strip():
                try:
                    reader = csv.reader([line], delimiter=delimiter)
                    row = next(reader, [])
                    if row:
                        logger.warning(f"No clear LinkedIn headers found, using line {i+1} as headers: {row}")
                        return i, row
                except:
                    continue
        
        return -1, []

    def parse_csv_content(self, content: bytes) -> Tuple[List[Dict[str, Any]], List[str]]:
        """Parse CSV content and return rows and any errors"""
        errors = []
        rows = []
        
        try:
            # Check if this might be a Numbers file (which we can't process)
            if content.startswith(b'PK') or b'Numbers' in content[:100]:
                errors.append("Numbers files (.numbers) are not supported. Please export your Numbers file as CSV first.")
                return [], errors
            
            # Check if this might be an Excel file
            if content.startswith(b'PK') or content.startswith(b'\xd0\xcf\x11\xe0'):
                errors.append("Excel files are not yet supported. Please save your Excel file as CSV first.")
                return [], errors
            
            # Try to decode as UTF-8 first, then fall back to other encodings
            try:
                text_content = content.decode('utf-8')
            except UnicodeDecodeError:
                try:
                    text_content = content.decode('utf-8-sig')  # Handle BOM
                except UnicodeDecodeError:
                    try:
                        text_content = content.decode('latin-1')
                    except UnicodeDecodeError:
                        text_content = content.decode('cp1252')  # Windows encoding
            
            # Check if content looks like CSV
            if not any(delimiter in text_content for delimiter in [',', ';', '\t']):
                errors.append("File does not appear to be a valid CSV format")
                return [], errors
            
            # Split into lines for header detection
            lines = text_content.strip().split('\n')
            if not lines:
                errors.append("Empty CSV file")
                return [], errors
            
            # Try different delimiters to find the best one
            delimiters = [',', ';', '\t']
            best_delimiter = ','
            max_columns = 0
            
            for delimiter in delimiters:
                try:
                    sample_reader = csv.reader(io.StringIO(text_content[:1000]), delimiter=delimiter)
                    first_row = next(sample_reader, [])
                    if len(first_row) > max_columns:
                        max_columns = len(first_row)
                        best_delimiter = delimiter
                except:
                    continue
            
            # Find the actual header row (skip LinkedIn metadata)
            header_line_index, header_row = self.find_header_row(lines, best_delimiter)
            
            if header_line_index == -1 or not header_row:
                errors.append("No valid header row found in CSV file")
                return [], errors
            
            # Log detected headers for debugging
            logger.info(f"Detected CSV headers: {header_row}")
            
            # Normalize field names with case-insensitive matching
            normalized_fieldnames = []
            for field in header_row:
                normalized = self.normalize_field_name(field)
                normalized_fieldnames.append(normalized)
            
            logger.info(f"Normalized headers: {normalized_fieldnames}")
            
            # Process data rows (skip metadata and header rows)
            data_lines = lines[header_line_index + 1:]
            
            for i, line in enumerate(data_lines):
                if not line.strip():
                    continue
                    
                try:
                    # Parse the line as CSV
                    reader = csv.reader([line], delimiter=best_delimiter)
                    row_values = next(reader, [])
                    
                    if not row_values:
                        continue
                    
                    # Create normalized row dictionary
                    normalized_row = {}
                    has_data = False
                    
                    for j, (original_header, normalized_header) in enumerate(zip(header_row, normalized_fieldnames)):
                        value = row_values[j] if j < len(row_values) else ""
                        
                        # Clean up the value
                        if value:
                            value = str(value).strip()
                            if value.lower() in ['', 'null', 'none', 'n/a', 'na']:
                                value = ''
                            elif value:  # If we have actual data
                                has_data = True
                        
                        normalized_row[normalized_header] = value
                    
                    # Only add rows that have some data (ignore completely blank rows)
                    if has_data:
                        rows.append(normalized_row)
                        
                except Exception as row_error:
                    errors.append(f"Error processing data row {i+1}: {str(row_error)}")
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
        """Extract full name from row data, with fallbacks for incomplete data"""
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
        
        # If no name available, try company name as fallback
        company = str(row.get('company', '')).strip()
        if company:
            return f"Contact at {company}"
        
        # If still no name, try email as fallback
        email = str(row.get('email', '')).strip()
        if email:
            return email.split('@')[0].replace('.', ' ').replace('_', ' ').title()
        
        # Last resort: use "Unknown Contact"
        return "Unknown Contact"
    
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
    
    def parse_connected_date(self, date_str: str) -> datetime:
        """Parse LinkedIn 'Connected On' date format"""
        if not date_str:
            return datetime.utcnow()
        
        try:
            # LinkedIn format: "25 Jun 2023"
            return datetime.strptime(date_str.strip(), "%d %b %Y")
        except ValueError:
            try:
                # Alternative formats
                return datetime.strptime(date_str.strip(), "%Y-%m-%d")
            except ValueError:
                try:
                    return datetime.strptime(date_str.strip(), "%m/%d/%Y")
                except ValueError:
                    # If we can't parse the date, use current time
                    return datetime.utcnow()
    
    def is_valid_contact_row(self, row: Dict[str, Any]) -> bool:
        """Check if a row has enough data to be considered a valid contact"""
        first_name = str(row.get('first_name', '')).strip() if row.get('first_name') else ""
        last_name = str(row.get('last_name', '')).strip() if row.get('last_name') else ""
        company = str(row.get('company', '')).strip() if row.get('company') else ""
        email = str(row.get('email', '')).strip() if row.get('email') else ""
        profile_url = str(row.get('profile_url', '')).strip() if row.get('profile_url') else ""
        
        # A row is valid if it has:
        # 1. At least a first name OR last name (not both required)
        # 2. OR has a company name (for company-only contacts)
        # 3. OR has an email address
        # 4. OR has a LinkedIn profile URL
        has_name = bool(first_name) or bool(last_name)
        has_company = bool(company)
        has_email = bool(email)
        has_profile = bool(profile_url)
        
        return has_name or has_company or has_email or has_profile
    
    def row_to_contact(self, row: Dict[str, Any], row_index: int) -> Tuple[Contact, List[str]]:
        """Convert a CSV row to a Contact object"""
        errors = []
        
        try:
            # Check if row has minimum required data (First Name and Last Name)
            if not self.is_valid_contact_row(row):
                errors.append(f"Row {row_index}: Missing First Name or Last Name - skipping")
                return None, errors
            
            # Extract and clean data
            name = self.parse_name(row)
            
            email = str(row.get('email', '')).strip() if row.get('email') else ""
            # If no email, use placeholder or mark as missing
            if not email:
                email = None  # Will be stored as NULL in database
                
            company = str(row.get('company', '')).strip() if row.get('company') else ""
            title = str(row.get('title', '')).strip() if row.get('title') else ""
            phone = self.clean_phone_number(row.get('phone', ''))
            linkedin_url = self.clean_linkedin_url(row.get('profile_url', ''))
            notes = str(row.get('notes', '')).strip() if row.get('notes') else ""
            
            # Add note about missing email if applicable
            if not email:
                email_note = "Email missing from LinkedIn export"
                notes = f"{email_note}\n{notes}".strip() if notes else email_note
            
            # Parse connected date if available
            connected_date = None
            if row.get('connected_on'):
                connected_date = self.parse_connected_date(row.get('connected_on', ''))
            
            # Determine relationship strength
            relationship_strength = self.determine_relationship_strength(row)
            
            # Create contact
            current_time = datetime.utcnow()
            added_at = connected_date if connected_date else current_time
            
            # Add connected date to notes if available
            if connected_date and connected_date != current_time:
                date_note = f"Connected on LinkedIn: {connected_date.strftime('%d %b %Y')}"
                notes = f"{date_note}\n{notes}".strip() if notes else date_note
            
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
                tags=["csv-import", "linkedin-export"],
                addedAt=added_at,
                createdAt=current_time,
                updatedAt=current_time
            )
            
            return contact, errors
            
        except Exception as e:
            errors.append(f"Row {row_index}: Error creating contact - {str(e)}")
            return None, errors
    
    async def process_csv_file_async(self, content: bytes, progress_callback: Optional[callable] = None, timeout_seconds: int = 30) -> Tuple[List[Contact], int, List[str]]:
        """Process CSV file asynchronously with progress tracking and timeout"""
        start_time = time.time()
        
        try:
            # Parse CSV content with timeout
            parse_task = asyncio.create_task(self._parse_csv_content_async(content))
            rows, parse_errors = await asyncio.wait_for(parse_task, timeout=timeout_seconds)
            
            if not rows:
                error_msg = "No valid contacts found."
                if parse_errors:
                    # Get detected headers for debugging
                    detected_headers = []
                    try:
                        # Try to extract headers from the first few lines for debugging
                        text_content = content.decode('utf-8', errors='ignore')
                        lines = text_content.strip().split('\n')[:10]  # First 10 lines
                        for line in lines:
                            if line.strip() and ',' in line:
                                reader = csv.reader([line])
                                row = next(reader, [])
                                if row and len(row) > 2:  # Looks like a header row
                                    detected_headers = row
                                    break
                    except:
                        pass
                    
                    if detected_headers:
                        error_msg += f" Detected headers: {', '.join(detected_headers[:5])}"
                        if len(detected_headers) > 5:
                            error_msg += f" (and {len(detected_headers) - 5} more)"
                
                return [], 0, parse_errors or [error_msg]
            
            contacts = []
            all_errors = parse_errors.copy()
            total_rows = len(rows)
            chunk_size = 1000  # Smaller chunks for better progress feedback
            
            # Process rows in chunks to avoid blocking
            for chunk_start in range(0, total_rows, chunk_size):
                # Check timeout
                if time.time() - start_time > timeout_seconds:
                    all_errors.append(f"Processing timed out after {timeout_seconds} seconds. Processed {len(contacts)} of {total_rows} rows.")
                    break
                
                chunk_end = min(chunk_start + chunk_size, total_rows)
                chunk_rows = rows[chunk_start:chunk_end]
                
                # Process chunk with batch optimization
                chunk_contacts = []
                for i, row in enumerate(chunk_rows, chunk_start + 1):
                    contact, row_errors = self.row_to_contact(row, i)
                    
                    if contact:
                        chunk_contacts.append(contact)
                    
                    all_errors.extend(row_errors)
                
                contacts.extend(chunk_contacts)
                
                # Report progress more frequently
                if progress_callback:
                    progress = min(chunk_end / total_rows * 100, 100)
                    await progress_callback(f"Processing rows... {chunk_end} of {total_rows}", progress)
                
                # Yield control more frequently for better responsiveness
                await asyncio.sleep(0.01)  # 10ms yield instead of 1ms
            
            # If no valid contacts were found, provide helpful debugging info
            if not contacts and rows:
                detected_headers = list(rows[0].keys()) if rows else []
                
                debug_message = f"No valid contacts found. Detected headers: {', '.join(detected_headers)}"
                all_errors.append(debug_message)
            
            return contacts, total_rows, all_errors
            
        except asyncio.TimeoutError:
            return [], 0, [f"CSV processing timed out after {timeout_seconds} seconds. Please try with a smaller file or contact support."]
        except Exception as e:
            return [], 0, [f"Failed to process CSV: {str(e)}"]
    
    def process_csv_file(self, content: bytes) -> Tuple[List[Contact], int, List[str]]:
        """Synchronous wrapper for CSV processing (for backward compatibility)"""
        try:
            # Run the async version in a new event loop
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                return loop.run_until_complete(self.process_csv_file_async(content, timeout_seconds=30))
            finally:
                loop.close()
        except Exception as e:
            return [], 0, [f"Failed to process CSV: {str(e)}"]
    
    async def _parse_csv_content_async(self, content: bytes) -> Tuple[List[Dict[str, Any]], List[str]]:
        """Async version of parse_csv_content for timeout handling"""
        return self.parse_csv_content(content)
    
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