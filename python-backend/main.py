from fastapi import FastAPI, HTTPException, UploadFile, File, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from contextlib import asynccontextmanager
import os
from dotenv import load_dotenv
import logging
import time
import asyncio
from typing import List, Optional
from datetime import datetime

# Import our models and services
from models import (
    Contact, FileUploadRecord, CSVImportRequest, LinkedInImportRequest,
    ContactsResponse, ImportResponse, FileUploadsResponse, LinkedInStatusResponse,
    UploadStatus, UploadSource
)
from database import DatabaseService
from csv_service_enhanced import CSVService
from auth import get_current_user, get_current_user_strict, AuthService
from pydantic import BaseModel

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global variables for database
mongodb_client: AsyncIOMotorClient = None
database = None
db_service: DatabaseService = None
csv_service: CSVService = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    global mongodb_client, database, db_service, csv_service
    
    mongodb_uri = os.getenv("MONGODB_URI")
    if not mongodb_uri:
        logger.error("MONGODB_URI environment variable is not set")
        raise ValueError("MONGODB_URI environment variable is required")
    
    try:
        # Configure MongoDB client with SSL settings for macOS compatibility
        mongodb_client = AsyncIOMotorClient(
            mongodb_uri,
            tlsAllowInvalidCertificates=True,  # Allow self-signed certificates
            serverSelectionTimeoutMS=5000,    # Reduce timeout for faster feedback
            connectTimeoutMS=5000,
            socketTimeoutMS=5000
        )
        database = mongodb_client.connectorpro
        
        # Test the connection
        await mongodb_client.admin.command('ping')
        logger.info("Successfully connected to MongoDB Atlas")
        
        # Initialize services
        db_service = DatabaseService(database)
        csv_service = CSVService()
        
    except Exception as e:
        logger.error(f"Failed to connect to MongoDB: {e}")
        raise
    
    yield
    
    # Shutdown
    if mongodb_client:
        mongodb_client.close()
        logger.info("MongoDB connection closed")

# Create FastAPI app with lifespan events
app = FastAPI(
    title="ConnectorPro API",
    description="AI-powered LinkedIn networking assistant backend",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
cors_origins = ["http://localhost:5173", "http://localhost:5138", "http://localhost:5137", "http://localhost:5139", "http://127.0.0.1:5138", "http://127.0.0.1:5173", "http://127.0.0.1:5137", "http://127.0.0.1:5139"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Dependency to get database service
async def get_db_service() -> DatabaseService:
    if db_service is None:
        raise HTTPException(status_code=503, detail="Database service not initialized")
    return db_service

# Dependency to get CSV service
async def get_csv_service() -> CSVService:
    if csv_service is None:
        raise HTTPException(status_code=503, detail="CSV service not initialized")
    return csv_service

# Health check endpoint
@app.get("/healthz")
async def health_check():
    """
    Health check endpoint that verifies database connectivity
    """
    try:
        # Test database connection
        if database is None:
            raise HTTPException(status_code=503, detail="Database not initialized")
        
        # Ping the database to ensure connectivity
        await mongodb_client.admin.command('ping')
        
        return {
            "status": "ok",
            "database": "connected",
            "message": "Service is healthy"
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(
            status_code=503, 
            detail=f"Service unhealthy: {str(e)}"
        )

# API v1 router placeholder
@app.get("/api/v1")
async def api_root():
    """
    API v1 root endpoint
    """
    return {
        "message": "ConnectorPro API v1",
        "version": "1.0.0",
        "status": "active"
    }

# Root endpoint
@app.get("/")
async def root():
    """
    Root endpoint
    """
    return {
        "message": "ConnectorPro Backend API",
        "version": "1.0.0",
        "docs": "/docs"
    }

# CONTACTS ENDPOINTS

@app.get("/api/v1/contacts/stats")
async def get_contact_stats(
    db: DatabaseService = Depends(get_db_service)
):
    """Get contact statistics including total active contacts"""
    try:
        # Get total unique contacts count
        total_contacts = await db.count_contacts()
        
        # Get latest upload record to show new contacts from last upload
        latest_uploads = await db.get_file_upload_records(skip=0, limit=1)
        latest_upload = latest_uploads[0] if latest_uploads else None
        
        return {
            "totalActiveContacts": total_contacts,
            "latestUpload": {
                "contactsImported": latest_upload.contactsImported if latest_upload else 0,
                "uploadedAt": latest_upload.uploadedAt.isoformat() if latest_upload else None,
                "fileName": latest_upload.fileName if latest_upload else None,
                "status": latest_upload.status if latest_upload else None
            } if latest_upload else None
        }
    except Exception as e:
        logger.error(f"Error getting contact stats: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve contact statistics")

@app.get("/api/v1/contacts", response_model=ContactsResponse)
async def get_contacts(
    page: int = Query(1, ge=1),
    limit: int = Query(100, ge=1, le=1000),
    company: Optional[str] = Query(None),
    db: DatabaseService = Depends(get_db_service)
):
    """Get contacts with pagination and filtering"""
    try:
        skip = (page - 1) * limit
        
        # Build filters
        filters = {}
        if company:
            filters["company"] = {"$regex": company, "$options": "i"}
        
        contacts = await db.get_contacts(skip=skip, limit=limit, filters=filters)
        total = await db.count_contacts(filters=filters)
        
        return ContactsResponse(
            contacts=contacts,
            total=total,
            page=page,
            limit=limit
        )
    except Exception as e:
        logger.error(f"Error getting contacts: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve contacts")

@app.post("/api/v1/contacts", response_model=Contact)
async def create_contact(
    contact: Contact,
    db: DatabaseService = Depends(get_db_service)
):
    """Create a new contact"""
    try:
        # Check for duplicates
        duplicates = await db.find_duplicate_contacts(
            email=contact.email,
            linkedin_url=contact.linkedinUrl
        )
        
        if duplicates:
            raise HTTPException(
                status_code=409,
                detail="Contact with this email or LinkedIn URL already exists"
            )
        
        created_contact = await db.create_contact(contact)
        return created_contact
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating contact: {e}")
        raise HTTPException(status_code=500, detail="Failed to create contact")

@app.get("/api/v1/contacts/{contact_id}", response_model=Contact)
async def get_contact(
    contact_id: str,
    db: DatabaseService = Depends(get_db_service)
):
    """Get a contact by ID"""
    contact = await db.get_contact_by_id(contact_id)
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    return contact

@app.put("/api/v1/contacts/{contact_id}", response_model=Contact)
async def update_contact(
    contact_id: str,
    contact_data: dict,
    db: DatabaseService = Depends(get_db_service)
):
    """Update a contact"""
    contact_data["updatedAt"] = datetime.now()
    updated_contact = await db.update_contact(contact_id, contact_data)
    if not updated_contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    return updated_contact

@app.delete("/api/v1/contacts/{contact_id}")
async def delete_contact(
    contact_id: str,
    db: DatabaseService = Depends(get_db_service)
):
    """Delete a contact"""
    success = await db.delete_contact(contact_id)
    if not success:
        raise HTTPException(status_code=404, detail="Contact not found")
    return {"message": "Contact deleted successfully"}

# CSV IMPORT ENDPOINT

@app.post("/api/v1/contacts/import/csv", response_model=ImportResponse)
async def import_contacts_from_csv(
    file: UploadFile = File(...),
    db: DatabaseService = Depends(get_db_service),
    csv_svc: CSVService = Depends(get_csv_service)
):
    """Import contacts from CSV file with progress tracking and timeout handling"""
    start_time = time.time()
    
    try:
        # Validate file exists and has a filename
        if not file or not file.filename:
            raise HTTPException(status_code=400, detail="No file uploaded")
        
        # Validate file type - only CSV for now (Excel/Numbers need special handling)
        filename_lower = file.filename.lower()
        if not filename_lower.endswith('.csv'):
            if filename_lower.endswith(('.xlsx', '.xls')):
                raise HTTPException(
                    status_code=400,
                    detail="Excel files are not yet supported. Please save your Excel file as CSV first."
                )
            elif filename_lower.endswith('.numbers'):
                raise HTTPException(
                    status_code=400,
                    detail="Numbers files are not supported. Please export your Numbers file as CSV first."
                )
            else:
                raise HTTPException(
                    status_code=400,
                    detail="Invalid file type. Please upload a CSV file."
                )
        
        # Validate MIME type if provided
        if file.content_type and file.content_type not in ['text/csv', 'application/csv', 'text/plain']:
            logger.warning(f"Unexpected MIME type: {file.content_type}, but filename suggests CSV")
        
        # Read file content
        content = await file.read()
        if len(content) == 0:
            raise HTTPException(status_code=400, detail="Empty file uploaded")
        
        # Check file size (10MB limit for better UX)
        if len(content) > 10 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="File size exceeds 10MB limit")
        
        # Progress tracking (in a real app, you'd use WebSockets or Server-Sent Events)
        progress_messages = []
        
        async def progress_callback(message: str, progress: float):
            progress_messages.append(f"{message} ({progress:.1f}%)")
            logger.info(f"CSV Import Progress: {message} ({progress:.1f}%)")
        
        # Process CSV file with async processing and timeout
        try:
            contacts, total_rows, processing_errors = await csv_svc.process_csv_file_async(
                content,
                progress_callback=progress_callback,
                timeout_seconds=30
            )
        except asyncio.TimeoutError:
            # Create failed upload record for timeout
            upload_record = FileUploadRecord(
                fileName=file.filename,
                fileSize=len(content),
                fileType=file.content_type or "text/csv",
                uploadSource=UploadSource.CSV,
                contactsImported=0,
                totalRows=0,
                status=UploadStatus.FAILED,
                errorMessage="Processing timed out after 30 seconds",
                metadata={
                    "processingDuration": time.time() - start_time,
                    "timeoutReason": "Large file or complex processing"
                }
            )
            await db.create_file_upload_record(upload_record)
            
            raise HTTPException(
                status_code=408,
                detail="CSV processing timed out after 30 seconds. Please try with a smaller file or contact support."
            )
        
        if not contacts:
            # Create failed upload record with detailed error info
            error_detail = "No valid contacts found in file"
            if processing_errors:
                # Extract the most helpful error message
                detailed_errors = [err for err in processing_errors if "Detected headers:" in err]
                if detailed_errors:
                    error_detail = detailed_errors[0]
                else:
                    error_detail += f". {processing_errors[0]}" if processing_errors else ""
            
            upload_record = FileUploadRecord(
                fileName=file.filename,
                fileSize=len(content),
                fileType=file.content_type or "text/csv",
                uploadSource=UploadSource.CSV,
                contactsImported=0,
                totalRows=total_rows,
                status=UploadStatus.FAILED,
                errorMessage=error_detail,
                metadata={
                    "processingErrors": processing_errors[:10],  # Limit errors stored
                    "processingDuration": time.time() - start_time,
                    "progressMessages": progress_messages
                }
            )
            await db.create_file_upload_record(upload_record)
            
            raise HTTPException(
                status_code=400,
                detail=error_detail
            )
        
        # Validate and deduplicate contacts
        valid_contacts, validation_errors = csv_svc.validate_contacts(contacts)
        all_errors = processing_errors + validation_errors
        
        # Optimize duplicate checking with batch operations
        new_contacts = []
        skipped_count = 0
        
        # Extract all emails and LinkedIn URLs for batch duplicate checking
        emails_to_check = [c.email for c in valid_contacts if c.email]
        linkedin_urls_to_check = [c.linkedinUrl for c in valid_contacts if c.linkedinUrl]
        
        # Batch check for existing contacts (much faster than individual queries)
        existing_emails = set()
        existing_linkedin_urls = set()
        
        if emails_to_check:
            existing_email_contacts = await db.db.contacts.find(
                {"email": {"$in": emails_to_check}},
                {"email": 1}
            ).to_list(length=None)
            existing_emails = {c["email"] for c in existing_email_contacts}
        
        if linkedin_urls_to_check:
            existing_linkedin_contacts = await db.db.contacts.find(
                {"linkedinUrl": {"$in": linkedin_urls_to_check}},
                {"linkedinUrl": 1}
            ).to_list(length=None)
            existing_linkedin_urls = {c["linkedinUrl"] for c in existing_linkedin_contacts}
        
        # Filter out duplicates using the batch results
        for contact in valid_contacts:
            is_duplicate = False
            
            if contact.email and contact.email in existing_emails:
                is_duplicate = True
            elif contact.linkedinUrl and contact.linkedinUrl in existing_linkedin_urls:
                is_duplicate = True
            
            if not is_duplicate:
                new_contacts.append(contact)
            else:
                skipped_count += 1
                all_errors.append(f"Skipped duplicate contact: {contact.name}")
        
        # Bulk create new contacts
        imported_contacts = []
        if new_contacts:
            imported_contacts = await db.bulk_create_contacts(new_contacts)
        
        processing_duration = time.time() - start_time
        
        # Create upload record - mark as SUCCESS if file was processed successfully,
        # regardless of whether new contacts were imported
        upload_record = FileUploadRecord(
            fileName=file.filename,
            fileSize=len(content),
            fileType=file.content_type or "text/csv",
            uploadSource=UploadSource.CSV,
            contactsImported=len(imported_contacts),
            totalRows=total_rows,
            status=UploadStatus.SUCCESS,  # Always SUCCESS if we got this far (file processed successfully)
            errorMessage=None,
            metadata={
                "skippedDuplicates": skipped_count,
                "processingErrors": all_errors[:20],  # Limit errors stored
                "processingDuration": processing_duration,
                "message": f"Successfully processed {total_rows} rows, imported {len(imported_contacts)} new contacts, skipped {skipped_count} duplicates"
            }
        )
        
        created_record = await db.create_file_upload_record(upload_record)
        
        # Convert contacts to simple dictionaries for frontend compatibility
        contacts_for_frontend = []
        for contact in imported_contacts:
            try:
                contact_dict = {
                    "id": str(contact.id) if contact.id else None,
                    "name": contact.name or "",
                    "title": contact.title or "",
                    "company": contact.company or "",
                    "email": contact.email or "",
                    "phone": contact.phone or "",
                    "linkedinUrl": contact.linkedinUrl or "",
                    "degree": str(contact.degree) if contact.degree else "1",
                    "relationshipStrength": str(contact.relationshipStrength) if contact.relationshipStrength else "weak",
                    "commonalities": contact.commonalities or [],
                    "notes": contact.notes or "",
                    "tags": contact.tags or [],
                    "addedAt": contact.addedAt.isoformat() if hasattr(contact, 'addedAt') and contact.addedAt else None,
                    "lastContact": contact.lastContact.isoformat() if hasattr(contact, 'lastContact') and contact.lastContact else None,
                    "linkedinData": contact.linkedinData or {},
                    "createdAt": contact.createdAt.isoformat() if hasattr(contact, 'createdAt') and contact.createdAt else None,
                    "updatedAt": contact.updatedAt.isoformat() if hasattr(contact, 'updatedAt') and contact.updatedAt else None
                }
                contacts_for_frontend.append(contact_dict)
            except Exception as e:
                logger.error(f"Error serializing contact {contact.name}: {e}")
                # Add a minimal contact dict to avoid breaking the response
                contacts_for_frontend.append({
                    "id": str(contact.id) if hasattr(contact, 'id') and contact.id else None,
                    "name": str(contact.name) if hasattr(contact, 'name') else "Unknown",
                    "title": "",
                    "company": "",
                    "email": "",
                    "phone": "",
                    "linkedinUrl": "",
                    "degree": "1",
                    "relationshipStrength": "weak",
                    "commonalities": [],
                    "notes": "",
                    "tags": [],
                    "addedAt": None,
                    "lastContact": None,
                    "linkedinData": {},
                    "createdAt": None,
                    "updatedAt": None
                })

        # Create a more informative success message
        if len(imported_contacts) > 0:
            if skipped_count > 0:
                message = f"Successfully imported {len(imported_contacts)} new contacts and skipped {skipped_count} duplicates"
            else:
                message = f"Successfully imported {len(imported_contacts)} contacts"
        else:
            if skipped_count > 0:
                message = f"File processed successfully! All {skipped_count} contacts were already in your network (duplicates skipped)"
            else:
                message = "File processed successfully! No contacts found to import"

        return ImportResponse(
            success=True,
            message=message,
            imported=len(imported_contacts),
            total=total_rows,
            contacts=contacts_for_frontend,
            uploadId=created_record.id,
            processingDuration=processing_duration,
            errors=all_errors[:10]  # Return limited errors to client
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error importing CSV: {e}")
        
        # Create failed upload record
        try:
            upload_record = FileUploadRecord(
                fileName=file.filename,
                fileSize=len(content) if 'content' in locals() else 0,
                fileType=file.content_type or "text/csv",
                uploadSource=UploadSource.CSV,
                contactsImported=0,
                totalRows=0,
                status=UploadStatus.FAILED,
                errorMessage=str(e),
                metadata={
                    "processingDuration": time.time() - start_time
                }
            )
            await db.create_file_upload_record(upload_record)
        except:
            pass  # Don't fail the main error if we can't create the record
        
        raise HTTPException(status_code=500, detail=f"Failed to import CSV: {str(e)}")

# LINKEDIN INTEGRATION ENDPOINTS

@app.get("/api/v1/linkedin/rapidapi/status", response_model=LinkedInStatusResponse)
async def get_linkedin_status():
    """Get LinkedIn RapidAPI integration status"""
    # For demo purposes, we'll simulate a configured status
    # In a real implementation, you would check if RapidAPI keys are configured
    rapidapi_key = os.getenv("RAPIDAPI_KEY")
    
    if rapidapi_key:
        return LinkedInStatusResponse(
            status="configured",
            message="LinkedIn RapidAPI integration is configured and ready",
            configured=True
        )
    else:
        return LinkedInStatusResponse(
            status="not_configured",
            message="LinkedIn RapidAPI key not configured. Please add RAPIDAPI_KEY to environment variables.",
            configured=False
        )

@app.post("/api/v1/contacts/import/linkedin", response_model=ImportResponse)
async def import_contacts_from_linkedin(
    request: LinkedInImportRequest,
    db: DatabaseService = Depends(get_db_service)
):
    """Import contacts from LinkedIn (simulated for demo)"""
    start_time = time.time()
    
    try:
        # For demo purposes, we'll create some mock LinkedIn contacts
        # In a real implementation, you would use the RapidAPI LinkedIn scraper
        
        current_time = datetime.utcnow()
        mock_linkedin_contacts = [
            Contact(
                name="Sarah Chen",
                title="Senior Product Marketing Manager",
                company="Meta",
                email="sarah.chen@meta.com",
                linkedinUrl="https://linkedin.com/in/sarahchen",
                degree=1,
                relationshipStrength="medium",
                tags=["linkedin-import", "meta"],
                notes="Imported from LinkedIn",
                addedAt=current_time,
                createdAt=current_time,
                updatedAt=current_time
            ),
            Contact(
                name="Mike Rodriguez",
                title="VP Product Marketing",
                company="Stripe",
                email="mike.rodriguez@stripe.com",
                linkedinUrl="https://linkedin.com/in/mikerodriguez",
                degree=1,
                relationshipStrength="medium",
                tags=["linkedin-import", "stripe"],
                notes="Imported from LinkedIn",
                addedAt=current_time,
                createdAt=current_time,
                updatedAt=current_time
            ),
            Contact(
                name="David Kim",
                title="Principal PM Manager",
                company="Microsoft",
                email="david.kim@microsoft.com",
                linkedinUrl="https://linkedin.com/in/davidkim",
                degree=1,
                relationshipStrength="medium",
                tags=["linkedin-import", "microsoft"],
                notes="Imported from LinkedIn",
                addedAt=current_time,
                createdAt=current_time,
                updatedAt=current_time
            )
        ]
        
        # Filter out existing contacts
        new_contacts = []
        for contact in mock_linkedin_contacts:
            existing = await db.find_duplicate_contacts(
                email=contact.email,
                linkedin_url=contact.linkedinUrl
            )
            if not existing:
                new_contacts.append(contact)
        
        # Import new contacts
        imported_contacts = []
        if new_contacts:
            imported_contacts = await db.bulk_create_contacts(new_contacts)
        
        processing_duration = time.time() - start_time
        
        # Create upload record
        upload_record = FileUploadRecord(
            fileName="LinkedIn Import",
            fileSize=0,
            fileType="application/json",
            uploadSource=UploadSource.LINKEDIN,
            contactsImported=len(imported_contacts),
            totalRows=len(mock_linkedin_contacts),
            status=UploadStatus.SUCCESS,
            metadata={
                "accessToken": "hidden",
                "processingDuration": processing_duration,
                "requestedCount": request.count
            }
        )
        
        await db.create_file_upload_record(upload_record)
        
        # Create better message based on results
        if len(imported_contacts) > 0:
            message = f"Successfully imported {len(imported_contacts)} LinkedIn contacts"
        else:
            skipped_count = len(mock_linkedin_contacts) - len(imported_contacts)
            if skipped_count > 0:
                message = f"No new contacts to import ({skipped_count} duplicates skipped)"
            else:
                message = "No contacts available to import"
        
        return ImportResponse(
            success=True,
            message=message,
            imported=len(imported_contacts),
            total=len(mock_linkedin_contacts),
            contacts=imported_contacts,
            processingDuration=processing_duration
        )
        
    except Exception as e:
        logger.error(f"Error importing LinkedIn contacts: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to import LinkedIn contacts: {str(e)}")

# FILE UPLOAD HISTORY ENDPOINTS

@app.get("/api/v1/file-uploads/", response_model=FileUploadsResponse)
async def get_file_upload_history(
    page: int = Query(1, ge=1),
    limit: int = Query(5, ge=1, le=10),  # Default to 5, max 10
    db: DatabaseService = Depends(get_db_service)
):
    """Get file upload history (limited to last 5 uploads)"""
    try:
        skip = (page - 1) * limit
        uploads = await db.get_file_upload_records(skip=skip, limit=limit)
        
        # Remove duplicates based on fileName and uploadedAt (keep most recent)
        seen = set()
        unique_uploads = []
        for upload in uploads:
            key = f"{upload.fileName}_{upload.uploadedAt}"
            if key not in seen:
                seen.add(key)
                unique_uploads.append(upload)
        
        # Limit to 5 most recent
        unique_uploads = unique_uploads[:5]
        
        return FileUploadsResponse(
            uploads=unique_uploads,
            total=len(unique_uploads)
        )
    except Exception as e:
        logger.error(f"Error getting file upload history: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve upload history")

@app.delete("/api/v1/file-uploads/{upload_id}")
async def delete_file_upload_record(
    upload_id: str,
    db: DatabaseService = Depends(get_db_service)
):
    """Delete a file upload record"""
    success = await db.delete_file_upload_record(upload_id)
    if not success:
        raise HTTPException(status_code=404, detail="Upload record not found")
    return {"message": "Upload record deleted successfully"}

# AUTHENTICATION ENDPOINTS

class LoginRequest(BaseModel):
    email: str
    password: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict

class RegisterRequest(BaseModel):
    email: str
    password: str
    name: str

@app.post("/api/v1/auth/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    """Login endpoint (demo mode - accepts any credentials)"""
    try:
        # For demo purposes, accept any email/password combination
        # In a real app, you would validate against a user database
        
        user_id = "demo-user-123"
        access_token = AuthService.create_access_token(user_id, request.email)
        
        return LoginResponse(
            access_token=access_token,
            user={
                "id": user_id,
                "email": request.email,
                "name": request.email.split("@")[0].title()
            }
        )
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(status_code=500, detail="Login failed")

@app.post("/api/v1/auth/register", response_model=LoginResponse)
async def register(request: RegisterRequest):
    """Register endpoint (demo mode - creates demo user)"""
    try:
        # For demo purposes, accept any registration
        # In a real app, you would create a user in the database
        
        user_id = f"user-{hash(request.email) % 10000}"
        access_token = AuthService.create_access_token(user_id, request.email)
        
        return LoginResponse(
            access_token=access_token,
            user={
                "id": user_id,
                "email": request.email,
                "name": request.name
            }
        )
    except Exception as e:
        logger.error(f"Registration error: {e}")
        raise HTTPException(status_code=500, detail="Registration failed")

@app.get("/api/v1/auth/me")
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    """Get current user information"""
    return {
        "user": current_user
    }

if __name__ == "__main__":
    import uvicorn
    
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=True,
        log_level="info"
    )