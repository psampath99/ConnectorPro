import csv
import io
import asyncio
from typing import List, Dict, Any, Tuple, Optional, AsyncGenerator
from models import Contact, ContactDegree, RelationshipStrength
from datetime import datetime
import logging
import re
import time

logger = logging.getLogger(__name__)

class CSVService:
    def __init__(self):
        # Enhanced field mappings for LinkedIn CSV exports
        self.field_mappings = {
            # LinkedIn standard mappings (case-insensitive)
            'first name': 'first_name',
            'last name': 'last_name',
            'url': 'profile_url',
            'email address': 'email',
            'company': 'company',
            'position': 'title',
            'connected on': 'connected_on',
            
            # Alternative variations
            'first_name': 'first_name',
            'firstname': 'first_name',
            'fname': 'first_name',
            'given name': 'first_name',
            'given_name': 'first_name',
            
            'last_name': 'last_name',
            'lastname': 'last_name',
            'lname': 'last_name',
            'surname': 'last_name',
            'family name': 'last_name',
            'family_name': 'last_name',
            
            'name': 'name',
            'full name': 'name',
            'full_name': 'name',
            'fullname': 'name',
            
            'email': 'email',
            'e-mail': 'email',
            'e_mail': 'email',
            'mail': 'email',
            
            'phone': 'phone',
            'phone number': 'phone',
            'phone_number': 'phone',
            'mobile': 'phone',
            'telephone': 'phone',
            'tel': 'phone',
            
            'organization': 'company',
            'organisation': 'company',
            'employer': 'company',
            'workplace': 'company',
            
            'title': 'title',
            'job title': 'title',
            'job_title': 'title',
            'role': 'title',
            'designation': 'title',
            
            'profile url': 'profile_url',
            'profile_url': 'profile_url',
            'linkedin': 'profile_url',
            'linkedin url': 'profile_url',
            'linkedin_url': 'profile_url',
            'linkedin profile': 'profile_url',
            'linkedin_profile': 'profile_url',
            'profile': 'profile_url',
            'link': 'profile_url',
            
            'connected_on': 'connected_on',
            'connection date': 'connected_on',
            'connection_date': 'connected_on',
            'date connected': 'connected_on',
            'date_connected': 'connected_on',
            
            'notes': 'notes',
            'comments': 'notes',
            'description': 'notes',
            'note': 'notes',
            'comment': 'notes',
        }
    
    def normalize_field_name(self, field_name: str) -> str:
        """Normalize field names with case-insensitive matching and space trimming"""
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
    
    def detect_metadata_rows(self, lines: List[str], delimiter: str) -> int:
        """Detect and skip the first 3-4 metadata rows in LinkedIn exports"""
        metadata_indicators = [
            'connections', 'notes', 'total', 'exported', 'linkedin',
            'data', 'export', 'privacy', 'settings'
        ]
        
        for i, line in enumerate(lines[:10]):  # Check first 10 lines max
            if not line.strip():
                continue
            
            try:
                reader = csv.reader([line], delimiter=delimiter)
                row = next(reader, [])
                
                if not row:
                    continue
                
                # Check if this looks like a header row
                cleaned_row = [cell.lower().strip() for cell in row if cell.strip()]
                
                # LinkedIn header indicators
                linkedin_headers = ['first name', 'last name', 'url', 'email address', 'company', 'position']
                header_matches = sum(1 for header in linkedin_headers if any(header in cell for cell in cleaned_row))
                
                # If we find 3+ LinkedIn headers, this is likely the header row
                if header_matches >= 3:
                    logger.info(f"Found header row at line {i+1}: {row}")
                    return i
                
                # Check if this is metadata (single column or metadata indicators)
                if len(cleaned_row) <= 2:
                    is_metadata = any(indicator in ' '.join(cleaned_row) for indicator in metadata_indicators)
                    if is_metadata:
                        logger.info(f"Skipping metadata row {i+1}: {row}")
                        continue
                
            except Exception:
                continue
        
        # If no clear header found, assume first non-empty row
        for i, line in enumerate(lines):
            if line.strip():
                logger.warning(f"No clear LinkedIn headers found, using line {i+1} as headers")
                return i
        
        return 0
    
    def detect_delimiter(self, content: str) -> str:
        """Detect the best CSV delimiter"""
        delimiters = [',', ';', '\t', '|']
        best_delimiter = ','
        max_columns = 0
        
        # Sample first few lines to detect delimiter, focusing on header-like rows
        sample_lines = content.split('\n')[:15]  # Check more lines
        
        for delimiter in delimiters:
            total_columns = 0
            consistent_columns = True
            first_row_columns = None
            valid_rows = 0
            
            for line in sample_lines:
                if not line.strip():
                    continue
                
                try:
                    reader = csv.reader([line], delimiter=delimiter)
                    row = next(reader, [])
                    
                    # Skip obvious metadata rows
                    if len(row) <= 2 and any(word in line.lower() for word in ['notes:', 'when exporting', 'connections']):
                        continue
                    
                    columns = len([cell for cell in row if cell.strip()])
                    
                    # Look for LinkedIn-like headers
                    if any(header in line.lower() for header in ['first name', 'last name', 'email', 'company']):
                        # This looks like a header row, give it more weight
                        columns *= 2
                    
                    if first_row_columns is None:
                        first_row_columns = columns
                    elif abs(columns - first_row_columns) > 3:  # Allow some variation
                        consistent_columns = False
                    
                    total_columns += columns
                    valid_rows += 1
                except:
                    continue
            
            # Prefer delimiter with more columns, consistency, and valid rows
            score = total_columns * (1 if consistent_columns else 0.5) * valid_rows
            if score > max_columns:
                max_columns = score
                best_delimiter = delimiter
        
        logger.info(f"Detected delimiter: '{best_delimiter}' with score {max_columns}")
        return best_delimiter
    
    async def parse_csv_content_streaming(self, content: bytes, chunk_size: int = 1000) -> AsyncGenerator[Tuple[List[Dict[str, Any]], List[str], bool], None]:
        """Parse CSV content in streaming mode for large files"""
        errors = []
        
        try:
            # Decode content
            try:
                text_content = content.decode('utf-8')
            except UnicodeDecodeError:
                try:
                    text_content = content.decode('utf-8-sig')  # Handle BOM
                except UnicodeDecodeError:
                    try:
                        text_content = content.decode('latin-1')
                    except UnicodeDecodeError:
                        text_content = content.decode('cp1252', errors='replace')
            
            # Check for file format issues
            if content.startswith(b'PK') or b'Numbers' in content[:100]:
                errors.append("Numbers files (.numbers) are not supported. Please export as CSV first.")
                yield [], errors, True
                return
            
            if content.startswith(b'PK') or content.startswith(b'\xd0\xcf\x11\xe0'):
                errors.append("Excel files are not yet supported. Please save as CSV first.")
                yield [], errors, True
                return
            
            # Split into lines
            lines = text_content.strip().split('\n')
            if not lines:
                errors.append("Empty CSV file")
                yield [], errors, True
                return
            
            # Detect delimiter
            delimiter = self.detect_delimiter(text_content)
            
            # Skip metadata rows and find headers
            header_line_index = self.detect_metadata_rows(lines, delimiter)
            
            if header_line_index >= len(lines):
                errors.append("No valid header row found in CSV file")
                yield [], errors, True
                return
            
            # Parse header row
            try:
                reader = csv.reader([lines[header_line_index]], delimiter=delimiter)
                header_row = next(reader, [])
            except Exception as e:
                errors.append(f"Failed to parse header row: {str(e)}")
                yield [], errors, True
                return
            
            if not header_row:
                errors.append("Empty header row found")
                yield [], errors, True
                return
            
            # Log detected headers
            logger.info(f"Detected CSV headers: {header_row}")
            
            # Normalize field names
            normalized_fieldnames = [self.normalize_field_name(field) for field in header_row]
            logger.info(f"Normalized headers: {normalized_fieldnames}")
            
            # Process data rows in chunks
            data_lines = lines[header_line_index + 1:]
            total_lines = len(data_lines)
            
            for chunk_start in range(0, total_lines, chunk_size):
                chunk_end = min(chunk_start + chunk_size, total_lines)
                chunk_lines = data_lines[chunk_start:chunk_end]
                
                chunk_rows = []
                chunk_errors = []
                
                for i, line in enumerate(chunk_lines):
                    if not line.strip():
                        continue
                    
                    try:
                        reader = csv.reader([line], delimiter=delimiter)
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
                                if value.lower() in ['', 'null', 'none', 'n/a', 'na', '-']:
                                    value = ''
                                elif value:
                                    has_data = True
                            
                            normalized_row[normalized_header] = value
                        
                        # Only add rows that have some data
                        if has_data:
                            chunk_rows.append(normalized_row)
                    
                    except Exception as row_error:
                        chunk_errors.append(f"Error processing row {chunk_start + i + 1}: {str(row_error)}")
                        continue
                
                # Yield chunk with completion status
                is_final_chunk = chunk_end >= total_lines
                yield chunk_rows, chunk_errors, is_final_chunk
                
                # Allow other tasks to run
                await asyncio.sleep(0.01)
        
        except Exception as e:
            errors.append(f"Failed to parse CSV: {str(e)}")
            yield [], errors, True
    
    def is_valid_contact_row(self, row: Dict[str, Any]) -> bool:
        """Check if a row has enough data to be considered a valid contact"""
        first_name = str(row.get('first_name', '')).strip() if row.get('first_name') else ""
        last_name = str(row.get('last_name', '')).strip() if row.get('last_name') else ""
        company = str(row.get('company', '')).strip() if row.get('company') else ""
        email = str(row.get('email', '')).strip() if row.get('email') else ""
        profile_url = str(row.get('profile_url', '')).strip() if row.get('profile_url') else ""
        
        # A row is valid if it has at least first_name OR last_name
        # This is the minimum requirement for LinkedIn exports
        has_name = bool(first_name) or bool(last_name)
        
        # Also accept if has company, email, or profile (for edge cases)
        has_other_data = bool(company) or bool(email) or bool(profile_url)
        
        return has_name or has_other_data
    
    def parse_name(self, row: Dict[str, Any]) -> str:
        """Extract full name from row data"""
        # Try full name first
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
        
        # Fallback to company or email
        company = str(row.get('company', '')).strip()
        if company:
            return f"Contact at {company}"
        
        email = str(row.get('email', '')).strip()
        if email:
            return email.split('@')[0].replace('.', ' ').replace('_', ' ').title()
        
        return "Unknown Contact"
    
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
    
    def determine_relationship_strength(self, row: Dict[str, Any]) -> RelationshipStrength:
        """Determine relationship strength based on available data"""
        if row.get('email'):
            return RelationshipStrength.MEDIUM
        if row.get('phone'):
            return RelationshipStrength.STRONG
        if row.get('notes'):
            return RelationshipStrength.MEDIUM
        return RelationshipStrength.WEAK
    
    def row_to_contact(self, row: Dict[str, Any], row_index: int) -> Tuple[Optional[Contact], List[str]]:
        """Convert a CSV row to a Contact object"""
        errors = []
        
        try:
            # Check if row has minimum required data
            if not self.is_valid_contact_row(row):
                errors.append(f"Row {row_index}: Missing both first name and last name - skipping")
                return None, errors
            
            # Extract and clean data
            name = self.parse_name(row)
            email = str(row.get('email', '')).strip() if row.get('email') else None
            company = str(row.get('company', '')).strip() if row.get('company') else None
            title = str(row.get('title', '')).strip() if row.get('title') else None
            phone = str(row.get('phone', '')).strip() if row.get('phone') else None
            linkedin_url = self.clean_linkedin_url(row.get('profile_url', ''))
            notes = str(row.get('notes', '')).strip() if row.get('notes') else ""
            
            # Parse connected date if available
            connected_date = None
            if row.get('connected_on'):
                try:
                    date_str = str(row.get('connected_on', '')).strip()
                    if date_str:
                        # LinkedIn format: "25 Jun 2023"
                        connected_date = datetime.strptime(date_str, "%d %b %Y")
                except ValueError:
                    try:
                        connected_date = datetime.strptime(date_str, "%Y-%m-%d")
                    except ValueError:
                        pass  # Use current time as fallback
            
            # Determine relationship strength
            relationship_strength = self.determine_relationship_strength(row)
            
            # Create contact
            current_time = datetime.utcnow()
            added_at = connected_date if connected_date else current_time
            
            contact = Contact(
                name=name,
                email=email,
                company=company,
                title=title,
                phone=phone,
                linkedinUrl=linkedin_url if linkedin_url else None,
                degree=ContactDegree.FIRST,
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
        """Process CSV file asynchronously with streaming, progress tracking, and timeout"""
        start_time = time.time()
        contacts = []
        all_errors = []
        total_rows_processed = 0
        chunk_size = 1000  # Smaller chunks for better progress granularity
        
        # First, estimate total rows for better progress calculation
        estimated_total_rows = 0
        try:
            text_content = content.decode('utf-8', errors='ignore')
            estimated_total_rows = max(1, len(text_content.split('\n')) - 5)  # Subtract metadata rows
        except:
            estimated_total_rows = 1000  # Default estimate
        
        try:
            # Process CSV in streaming mode
            async for chunk_rows, chunk_errors, is_final_chunk in self.parse_csv_content_streaming(content, chunk_size):
                # Check timeout
                if time.time() - start_time > timeout_seconds:
                    all_errors.append(f"Processing timed out after {timeout_seconds} seconds. Processed {len(contacts)} contacts so far.")
                    break
                
                # Add chunk errors
                all_errors.extend(chunk_errors)
                
                # If this is an error chunk (empty rows with errors), handle it
                if not chunk_rows and chunk_errors and is_final_chunk:
                    # This means we got a parsing error
                    break
                
                # Process contacts in this chunk with progress updates
                chunk_contacts = []
                for i, row in enumerate(chunk_rows):
                    row_index = total_rows_processed + i + 1
                    contact, row_errors = self.row_to_contact(row, row_index)
                    
                    if contact:
                        chunk_contacts.append(contact)
                    
                    all_errors.extend(row_errors)
                    
                    # Report progress every 100 rows within chunk for smoother updates
                    if progress_callback and (i + 1) % 100 == 0:
                        current_progress = min((total_rows_processed + i + 1) / estimated_total_rows * 100, 95)
                        await progress_callback(f"Processing row {total_rows_processed + i + 1}...", current_progress)
                        await asyncio.sleep(0.05)  # Longer yield for UI responsiveness
                
                contacts.extend(chunk_contacts)
                total_rows_processed += len(chunk_rows)
                
                # Report chunk completion progress
                if progress_callback:
                    if is_final_chunk:
                        await progress_callback(f"Processing complete: {total_rows_processed} rows processed", 100.0)
                    else:
                        # Calculate more accurate progress based on estimated total
                        current_progress = min(total_rows_processed / estimated_total_rows * 100, 95)
                        await progress_callback(f"Processed {total_rows_processed} rows...", current_progress)
                
                # Yield control between chunks
                await asyncio.sleep(0.05)
                
                if is_final_chunk:
                    break
            
            # Final validation
            if not contacts and total_rows_processed == 0:
                # Try to extract headers for debugging
                try:
                    text_content = content.decode('utf-8', errors='ignore')
                    lines = text_content.strip().split('\n')[:10]
                    detected_headers = []
                    
                    for line in lines:
                        if line.strip() and (',' in line or ';' in line or '\t' in line):
                            delimiter = ',' if ',' in line else (';' if ';' in line else '\t')
                            reader = csv.reader([line], delimiter=delimiter)
                            row = next(reader, [])
                            if row and len(row) > 2:
                                detected_headers = row
                                break
                    
                    if detected_headers:
                        error_msg = f"No valid contacts found. Detected headers: {', '.join(detected_headers[:7])}"
                        if len(detected_headers) > 7:
                            error_msg += f" (and {len(detected_headers) - 7} more)"
                        all_errors.append(error_msg)
                    else:
                        all_errors.append("No valid contacts found. Could not detect CSV headers.")
                        
                except Exception:
                    all_errors.append("No valid contacts found. File may not be a valid CSV format.")
            
            return contacts, total_rows_processed, all_errors
            
        except asyncio.TimeoutError:
            return contacts, total_rows_processed, [f"CSV processing timed out after {timeout_seconds} seconds. Processed {len(contacts)} contacts."]
        except Exception as e:
            logger.error(f"CSV processing error: {str(e)}")
            return contacts, total_rows_processed, all_errors + [f"Failed to process CSV: {str(e)}"]
    
    def validate_contacts(self, contacts: List[Contact]) -> Tuple[List[Contact], List[str]]:
        """Validate contacts and remove duplicates"""
        valid_contacts = []
        errors = []
        seen_emails = set()
        seen_linkedin_urls = set()
        
        for contact in contacts:
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