# Load environment variables FIRST before any imports that depend on them
import os
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, HTTPException, UploadFile, File, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from contextlib import asynccontextmanager
import logging
import time
import asyncio
from typing import List, Optional, Dict, Any
from datetime import datetime

# Import our models and services
from models import (
    Contact, FileUploadRecord, CSVImportRequest, LinkedInImportRequest,
    ContactsResponse, ImportResponse, FileUploadsResponse, LinkedInStatusResponse,
    UploadStatus, UploadSource, GmailAuthRequest, GmailConnectionResponse,
    GmailStatusResponse, GmailEmailsResponse, GmailSearchRequest,
    GmailSendRequest, GmailSendResponse, GmailConnectionStatus,
    UserTargetCompany, ToolOriginatedMessage, EnhancedGmailEmail,
    TargetCompanyRequest, TargetCompanyResponse, EnhancedEmailsResponse,
    NetworkQueryRequest, NetworkQueryResponse
)
from database import DatabaseService
from csv_service_enhanced import CSVService
from auth import get_current_user, get_current_user_strict, AuthService
from enhanced_auth import (
    EnhancedAuthService, enhanced_auth_service, get_enhanced_auth_service,
    get_current_user_enhanced, get_current_user_optional, limiter, auth_rate_limit
)
from user_models import UserCreate, UserLogin, TokenResponse, UserResponse, RefreshTokenRequest
from slowapi.errors import RateLimitExceeded
from gmail_service import gmail_service
from calendar_service import calendar_service
from llm_service import llm_service, LLMQuery, NetworkDataContext, LLMProvider
from pydantic import BaseModel

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
cors_origins = ["http://localhost:5173", "http://localhost:5138", "http://localhost:5137", "http://localhost:5139", "http://localhost:5140", "http://localhost:5141", "http://127.0.0.1:5138", "http://127.0.0.1:5173", "http://127.0.0.1:5137", "http://127.0.0.1:5139", "http://127.0.0.1:5140", "http://127.0.0.1:5141", "https://connectorpro.onrender.com"]
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

@app.post("/api/v1/contacts/migrate-degrees")
async def migrate_contact_degrees(
    db: DatabaseService = Depends(get_db_service)
):
    """Migrate existing contacts to ensure proper degree filtering"""
    try:
        # Update all contacts without a degree field to be 1st degree
        result = await db.db.contacts.update_many(
            {"degree": {"$exists": False}},
            {"$set": {"degree": 1}}
        )
        
        # Update all contacts with degree = 2 or 3 to be 1st degree (since CSV imports should be 1st degree)
        result2 = await db.db.contacts.update_many(
            {"degree": {"$in": [2, 3]}},
            {"$set": {"degree": 1}}
        )
        
        total_updated = result.modified_count + result2.modified_count
        
        return {
            "success": True,
            "message": f"Successfully migrated {total_updated} contacts to 1st degree",
            "updated_count": total_updated,
            "missing_degree_updated": result.modified_count,
            "non_first_degree_updated": result2.modified_count
        }
    except Exception as e:
        logger.error(f"Error migrating contact degrees: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to migrate contact degrees: {str(e)}")

@app.get("/api/v1/contacts/first-degree-only", response_model=ContactsResponse)
async def get_first_degree_contacts_only(
    page: int = Query(1, ge=1),
    limit: int = Query(100, ge=1, le=1000),
    company: Optional[str] = Query(None),
    db: DatabaseService = Depends(get_db_service)
):
    """Get only 1st degree connections with explicit filtering"""
    try:
        skip = (page - 1) * limit
        
        # Build filters - explicitly filter for 1st degree only
        filters = {"degree": 1}
        if company:
            filters["company"] = {"$regex": company, "$options": "i"}
        
        # Use direct database query to ensure filtering
        cursor = db.contacts_collection.find(filters).skip(skip).limit(limit)
        contacts = []
        async for doc in cursor:
            doc['id'] = str(doc['_id'])
            del doc['_id']
            contacts.append(Contact(**doc))
        
        total = await db.contacts_collection.count_documents(filters)
        
        return ContactsResponse(
            contacts=contacts,
            total=total,
            page=page,
            limit=limit
        )
    except Exception as e:
        logger.error(f"Error getting first degree contacts: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve first degree contacts")

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

# ENHANCED CONTACTS FILTERING ENDPOINTS (must come before generic {contact_id} route)

@app.get("/api/v1/contacts/target-companies", response_model=ContactsResponse)
async def get_contacts_by_target_companies(
    page: int = Query(1, ge=1),
    limit: int = Query(100, ge=1, le=1000),
    require_title: bool = Query(True, description="Filter out contacts without meaningful titles"),
    current_user: dict = Depends(get_current_user),
    db: DatabaseService = Depends(get_db_service)
):
    """Get contacts filtered by user's target companies with optional title filtering"""
    try:
        user_id = current_user.get("user_id", "demo-user")
        skip = (page - 1) * limit
        
        # DEBUG LOGGING: Log the request parameters
        logger.info(f"🔍 DEBUG - Target companies contacts API called for user {user_id}")
        logger.info(f"🔍 DEBUG - Parameters: page={page}, limit={limit}, require_title={require_title}")
        
        # Get user's target companies
        target_companies = await db.get_target_companies_by_user_id(user_id)
        logger.info(f"🔍 DEBUG - Found {len(target_companies)} target companies in database")
        
        if not target_companies:
            logger.info(f"🔍 DEBUG - No target companies found, returning empty result")
            return ContactsResponse(
                contacts=[],
                total=0,
                page=page,
                limit=limit
            )
        
        # Extract company names for filtering
        company_names = [tc.company_name for tc in target_companies]
        logger.info(f"🔍 DEBUG - Target company names: {company_names}")
        
        # Build filters
        filters = {
            "degree": 1,  # Only 1st degree connections
            "company": {"$in": company_names}
        }
        
        # Add title filtering if required
        if require_title:
            filters["title"] = {
                "$exists": True,
                "$ne": "",
                "$not": {"$regex": "^\\s*$"}  # Not just whitespace
            }
            logger.info(f"🔍 DEBUG - Title filtering enabled")
        
        logger.info(f"🔍 DEBUG - Final MongoDB filters: {filters}")
        
        # Get contacts
        cursor = db.contacts_collection.find(filters).skip(skip).limit(limit)
        contacts = []
        async for doc in cursor:
            doc['id'] = str(doc['_id'])
            del doc['_id']
            contacts.append(Contact(**doc))
        
        total = await db.contacts_collection.count_documents(filters)
        
        logger.info(f"🔍 DEBUG - Found {len(contacts)} contacts (page {page}) out of {total} total matching contacts")
        
        return ContactsResponse(
            contacts=contacts,
            total=total,
            page=page,
            limit=limit
        )
    except Exception as e:
        logger.error(f"Error getting contacts by target companies: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve target company contacts")

@app.get("/api/v1/contacts/grouped-by-company")
async def get_contacts_grouped_by_target_companies(
    require_title: bool = Query(True, description="Filter out contacts without meaningful titles"),
    target_companies_only: bool = Query(False, description="Filter to target companies only"),
    current_user: dict = Depends(get_current_user),
    db: DatabaseService = Depends(get_db_service)
):
    """Get contacts grouped by target companies with title filtering"""
    try:
        user_id = current_user.get("user_id", "demo-user")
        
        # DEBUG LOGGING: Log the request parameters
        logger.info(f"🔍 DEBUG - Grouped contacts API called for user {user_id}")
        logger.info(f"🔍 DEBUG - Parameters: require_title={require_title}, target_companies_only={target_companies_only}")
        
        # Get user's target companies
        target_companies = await db.get_target_companies_by_user_id(user_id)
        logger.info(f"🔍 DEBUG - Found {len(target_companies)} target companies in database")
        
        if not target_companies:
            logger.info(f"🔍 DEBUG - No target companies found, returning empty result")
            return {
                "success": True,
                "companies": {},
                "total_contacts": 0,
                "companies_with_contacts": 0,
                "target_companies": []
            }
        
        # Extract company names for filtering
        company_names = [tc.company_name for tc in target_companies]
        logger.info(f"🔍 DEBUG - Target company names: {company_names}")
        
        # Build base filters
        base_filters = {
            "degree": 1,  # Only 1st degree connections
        }
        
        # Only filter by target companies if target_companies_only is True
        if target_companies_only:
            base_filters["company"] = {"$in": company_names}
            logger.info(f"🔍 DEBUG - Filtering to target companies only: {company_names}")
        else:
            logger.info(f"🔍 DEBUG - Including all companies (not filtering to target companies)")
        
        # Add title filtering if required
        if require_title:
            base_filters["title"] = {
                "$exists": True,
                "$ne": "",
                "$not": {"$regex": "^\\s*$"}  # Not just whitespace
            }
            logger.info(f"🔍 DEBUG - Title filtering enabled")
        
        logger.info(f"🔍 DEBUG - Final MongoDB filters: {base_filters}")
        
        # Group contacts by company using aggregation
        pipeline = [
            {"$match": base_filters},
            {"$group": {
                "_id": "$company",
                "contacts": {"$push": "$$ROOT"},
                "count": {"$sum": 1}
            }},
            {"$sort": {"count": -1}}
        ]
        
        cursor = db.contacts_collection.aggregate(pipeline)
        companies_data = {}
        total_contacts = 0
        
        async for group in cursor:
            company_name = group["_id"]
            contacts_data = group["contacts"]
            
            # Transform contacts
            contacts = []
            for doc in contacts_data:
                doc['id'] = str(doc['_id'])
                del doc['_id']
                contacts.append(Contact(**doc).dict())
            
            companies_data[company_name] = {
                "contacts": contacts,
                "count": group["count"]
            }
            total_contacts += group["count"]
        
        logger.info(f"🔍 DEBUG - Found {len(companies_data)} companies with {total_contacts} total contacts")
        logger.info(f"🔍 DEBUG - Companies found: {list(companies_data.keys())}")
        
        return {
            "success": True,
            "companies": companies_data,
            "total_contacts": total_contacts,
            "companies_with_contacts": len(companies_data),
            "target_companies": company_names,
            "title_filtering_enabled": require_title
        }
    except Exception as e:
        logger.error(f"Error getting contacts grouped by target companies: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve grouped contacts")

@app.get("/api/v1/contacts/target-companies/stats")
async def get_target_company_contact_stats(
    current_user: dict = Depends(get_current_user),
    db: DatabaseService = Depends(get_db_service)
):
    """Get statistics about contacts at target companies"""
    try:
        user_id = current_user.get("user_id", "demo-user")
        
        # Get user's target companies
        target_companies = await db.get_target_companies_by_user_id(user_id)
        if not target_companies:
            return {
                "success": True,
                "stats": {
                    "total_target_companies": 0,
                    "companies_with_contacts": 0,
                    "total_contacts_at_targets": 0,
                    "contacts_with_titles": 0,
                    "contacts_without_titles": 0,
                    "title_coverage_percentage": 0
                },
                "company_breakdown": []
            }
        
        company_names = [tc.company_name for tc in target_companies]
        
        # Get all contacts at target companies
        all_contacts_filter = {
            "degree": 1,
            "company": {"$in": company_names}
        }
        
        # Get contacts with titles
        with_titles_filter = {
            "degree": 1,
            "company": {"$in": company_names},
            "title": {
                "$exists": True,
                "$ne": "",
                "$not": {"$regex": "^\\s*$"}
            }
        }
        
        # Count totals
        total_contacts = await db.contacts_collection.count_documents(all_contacts_filter)
        contacts_with_titles = await db.contacts_collection.count_documents(with_titles_filter)
        contacts_without_titles = total_contacts - contacts_with_titles
        
        # Get breakdown by company
        pipeline = [
            {"$match": all_contacts_filter},
            {"$group": {
                "_id": "$company",
                "total_contacts": {"$sum": 1},
                "contacts_with_titles": {
                    "$sum": {
                        "$cond": [
                            {
                                "$and": [
                                    {"$ne": ["$title", ""]},
                                    {"$ne": ["$title", None]},
                                    {"$not": {"$regexMatch": {"input": "$title", "regex": "^\\s*$"}}}
                                ]
                            },
                            1,
                            0
                        ]
                    }
                }
            }},
            {"$sort": {"total_contacts": -1}}
        ]
        
        cursor = db.contacts_collection.aggregate(pipeline)
        company_breakdown = []
        companies_with_contacts = 0
        
        async for group in cursor:
            if group["total_contacts"] > 0:
                companies_with_contacts += 1
                company_breakdown.append({
                    "company": group["_id"],
                    "total_contacts": group["total_contacts"],
                    "contacts_with_titles": group["contacts_with_titles"],
                    "contacts_without_titles": group["total_contacts"] - group["contacts_with_titles"],
                    "title_coverage_percentage": round((group["contacts_with_titles"] / group["total_contacts"]) * 100, 1) if group["total_contacts"] > 0 else 0
                })
        
        title_coverage_percentage = round((contacts_with_titles / total_contacts) * 100, 1) if total_contacts > 0 else 0
        
        return {
            "success": True,
            "stats": {
                "total_target_companies": len(target_companies),
                "companies_with_contacts": companies_with_contacts,
                "total_contacts_at_targets": total_contacts,
                "contacts_with_titles": contacts_with_titles,
                "contacts_without_titles": contacts_without_titles,
                "title_coverage_percentage": title_coverage_percentage
            },
            "company_breakdown": company_breakdown
        }
    except Exception as e:
        logger.error(f"Error getting target company contact stats: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve contact statistics")

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
    expires_in: int  # Token expiration time in seconds

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
        
        # Get token expiration time from environment
        expires_in = int(os.getenv("JWT_EXPIRES_IN", 900))
        
        return LoginResponse(
            access_token=access_token,
            user={
                "id": user_id,
                "email": request.email,
                "name": request.email.split("@")[0].title()
            },
            expires_in=expires_in
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
        
        # Get token expiration time from environment
        expires_in = int(os.getenv("JWT_EXPIRES_IN", 900))
        
        return LoginResponse(
            access_token=access_token,
            user={
                "id": user_id,
                "email": request.email,
                "name": request.name
            },
            expires_in=expires_in
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

# GMAIL INTEGRATION ENDPOINTS

@app.get("/api/v1/gmail/auth-url", response_model=GmailConnectionResponse)
async def get_gmail_auth_url(current_user: dict = Depends(get_current_user)):
    """Get Gmail OAuth2 authorization URL"""
    try:
        user_id = current_user.get("user_id", "demo-user")
        auth_url = gmail_service.get_authorization_url(user_id)
        logger.info(f"Generated Gmail Auth URL: {auth_url}")
        
        return GmailConnectionResponse(
            success=True,
            message="Authorization URL generated successfully",
            auth_url=auth_url
        )
    except Exception as e:
        logger.error(f"Error generating Gmail auth URL: {e}")
        return GmailConnectionResponse(
            success=False,
            message=f"Failed to generate authorization URL: {str(e)}"
        )

@app.post("/api/v1/gmail/connect", response_model=GmailConnectionResponse)
async def connect_gmail(
    auth_request: GmailAuthRequest,
    current_user: dict = Depends(get_current_user),
    db: DatabaseService = Depends(get_db_service)
):
    """Connect Gmail account using authorization code"""
    try:
        user_id = current_user.get("user_id", "demo-user")
        
        # Exchange code for tokens
        connection = await gmail_service.exchange_code_for_tokens(auth_request, user_id)
        
        # Check if connection already exists
        existing_connection = await db.get_gmail_connection_by_user_id(user_id)
        
        if existing_connection:
            # Update existing connection
            connection_data = connection.dict(exclude={'id'})
            updated_connection = await db.update_gmail_connection(user_id, connection_data)
            connection = updated_connection or connection
        else:
            # Create new connection
            connection = await db.create_gmail_connection(connection)
        
        return GmailConnectionResponse(
            success=True,
            message=f"Successfully connected Gmail account: {connection.email_address}",
            connection={
                "email_address": connection.email_address,
                "status": connection.status.value,
                "last_connected": connection.last_connected.isoformat(),
                "scopes": connection.scopes
            }
        )
        
    except Exception as e:
        logger.error(f"Error connecting Gmail: {e}")
        return GmailConnectionResponse(
            success=False,
            message=f"Failed to connect Gmail: {str(e)}"
        )

@app.get("/api/v1/gmail/status", response_model=GmailStatusResponse)
async def get_gmail_status(
    current_user: dict = Depends(get_current_user),
    db: DatabaseService = Depends(get_db_service)
):
    """Get Gmail connection status"""
    try:
        user_id = current_user.get("user_id", "demo-user")
        connection = await db.get_gmail_connection_by_user_id(user_id)
        
        if not connection:
            return GmailStatusResponse(
                status=GmailConnectionStatus.NOT_CONNECTED
            )
        
        # Check for scope mismatch first
        if not gmail_service._scopes_match(connection.scopes, gmail_service.default_scopes):
            logger.warning(f"Scope mismatch detected for user {user_id}. Current: {connection.scopes}, Required: {gmail_service.default_scopes}")
            # Clear the invalid connection
            await db.delete_gmail_connection(user_id)
            return GmailStatusResponse(
                status=GmailConnectionStatus.NOT_CONNECTED,
                error_message="Scope mismatch detected - please reconnect your Gmail account"
            )
        
        # Check if token is expired
        if datetime.now() >= connection.token_expires_at:
            try:
                # Try to refresh token
                connection = await gmail_service.refresh_access_token(connection)
                await db.update_gmail_connection(user_id, connection.dict(exclude={'id'}))
            except Exception as e:
                logger.error(f"Failed to refresh Gmail token: {e}")
                # If refresh fails due to scope mismatch, clear the connection
                if "scope mismatch" in str(e).lower():
                    await db.delete_gmail_connection(user_id)
                    return GmailStatusResponse(
                        status=GmailConnectionStatus.NOT_CONNECTED,
                        error_message="Scope mismatch detected - please reconnect your Gmail account"
                    )
                connection.status = GmailConnectionStatus.EXPIRED
                await db.update_gmail_connection(user_id, {"status": GmailConnectionStatus.EXPIRED})
        
        return GmailStatusResponse(
            status=connection.status,
            email_address=connection.email_address,
            last_connected=connection.last_connected,
            scopes=connection.scopes,
            error_message=connection.error_message
        )
        
    except Exception as e:
        logger.error(f"Error getting Gmail status: {e}")
        return GmailStatusResponse(
            status=GmailConnectionStatus.ERROR,
            error_message=str(e)
        )

@app.delete("/api/v1/gmail/disconnect")
async def disconnect_gmail(
    current_user: dict = Depends(get_current_user),
    db: DatabaseService = Depends(get_db_service)
):
    """Disconnect Gmail account"""
    try:
        user_id = current_user.get("user_id", "demo-user")
        success = await db.delete_gmail_connection(user_id)
        
        if success:
            return {"message": "Gmail account disconnected successfully"}
        else:
            raise HTTPException(status_code=404, detail="No Gmail connection found")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error disconnecting Gmail: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to disconnect Gmail: {str(e)}")

@app.get("/api/v1/gmail/emails", response_model=GmailEmailsResponse)
async def get_gmail_emails(
    query: str = "",
    max_results: int = 10,
    page_token: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db: DatabaseService = Depends(get_db_service)
):
    """Get emails from Gmail"""
    try:
        user_id = current_user.get("user_id", "demo-user")
        connection = await db.get_gmail_connection_by_user_id(user_id)
        
        if not connection:
            raise HTTPException(status_code=404, detail="Gmail not connected")
        
        if connection.status != GmailConnectionStatus.CONNECTED:
            raise HTTPException(status_code=400, detail="Gmail connection is not active")
        
        emails_response = await gmail_service.list_emails(connection, query, max_results, page_token)
        
        # Update connection if it was refreshed
        if connection.updated_at != connection.last_connected:
            await db.update_gmail_connection(user_id, connection.dict(exclude={'id'}))
        
        return emails_response
        
    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Error getting Gmail emails: {error_msg}")
        
        # Handle scope mismatch errors
        if "scope mismatch" in error_msg.lower():
            # Clear the invalid connection
            await db.delete_gmail_connection(user_id)
            raise HTTPException(status_code=401, detail="Scope mismatch detected - please reconnect your Gmail account")
        
        raise HTTPException(status_code=500, detail=f"Failed to get emails: {error_msg}")

@app.post("/api/v1/gmail/search", response_model=GmailEmailsResponse)
async def search_gmail_emails(
    search_request: GmailSearchRequest,
    current_user: dict = Depends(get_current_user),
    db: DatabaseService = Depends(get_db_service)
):
    """Search emails in Gmail"""
    try:
        user_id = current_user.get("user_id", "demo-user")
        connection = await db.get_gmail_connection_by_user_id(user_id)
        
        if not connection:
            raise HTTPException(status_code=404, detail="Gmail not connected")
        
        if connection.status != GmailConnectionStatus.CONNECTED:
            raise HTTPException(status_code=400, detail="Gmail connection is not active")
        
        emails_response = await gmail_service.list_emails(
            connection,
            search_request.query,
            search_request.max_results or 10,
            search_request.page_token
        )
        
        return emails_response
        
    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Error searching Gmail emails: {error_msg}")
        
        # Handle scope mismatch errors
        if "scope mismatch" in error_msg.lower():
            # Clear the invalid connection
            await db.delete_gmail_connection(user_id)
            raise HTTPException(status_code=401, detail="Scope mismatch detected - please reconnect your Gmail account")
        
        raise HTTPException(status_code=500, detail=f"Failed to search emails: {error_msg}")

@app.get("/api/v1/gmail/emails/by-companies", response_model=EnhancedEmailsResponse)
async def get_emails_by_target_companies(
    target_companies: Optional[str] = Query(None, description="Comma-separated list of target companies (optional if user has configured companies)"),
    max_results: int = Query(50, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
    db: DatabaseService = Depends(get_db_service)
):
    """Enhanced email filtering with flexible domain matching and tool-originated message support"""
    try:
        user_id = current_user.get("user_id", "demo-user")
        connection = await db.get_gmail_connection_by_user_id(user_id)
        
        if not connection:
            raise HTTPException(status_code=404, detail="Gmail not connected")
        
        if connection.status != GmailConnectionStatus.CONNECTED:
            raise HTTPException(status_code=400, detail="Gmail connection is not active")
        
        # Get user's configured target companies
        user_target_companies = await db.get_target_companies_by_user_id(user_id)
        
        # Parse target companies from query parameter or use configured companies
        companies = []
        if target_companies:
            companies = [company.strip() for company in target_companies.split(',')]
        elif user_target_companies:
            companies = [tc.company_name for tc in user_target_companies]
        else:
            # Fallback to default companies for backward compatibility
            companies = ["Meta", "Google", "Microsoft", "Apple", "Amazon", "Stripe"]
        
        # Build company domain mapping using flexible matching
        company_domain_map = {}
        domain_queries = []
        
        for company in companies:
            # Check if user has configured explicit domains for this company
            user_company = next((tc for tc in user_target_companies if tc.company_name.lower() == company.lower()), None)
            
            if user_company and user_company.company_domains:
                # Use user-configured domains
                company_domains = user_company.company_domains
            else:
                # Use default domain mapping
                company_domains = gmail_service.get_default_company_domains(company)
            
            company_domain_map[company] = company_domains
            
            # Add search queries for each domain
            for domain in company_domains:
                domain_queries.extend([
                    f"from:@{domain}",
                    f"from:{domain}"
                ])
        
        # Combine queries with OR operator
        search_query = " OR ".join(domain_queries) if domain_queries else ""
        
        logger.info(f"Enhanced Gmail search for target companies: {companies}")
        logger.info(f"Search query: {search_query}")
        logger.info(f"Company domain mapping: {company_domain_map}")
        
        # Get emails from Gmail
        emails_response = await gmail_service.list_emails(
            connection,
            search_query,
            max_results,
            None
        )
        
        # Get tool-originated messages for this user
        message_ids = [email.id for email in emails_response.emails]
        tool_originated_map = await db.bulk_check_tool_originated_messages(user_id, message_ids)
        
        # Enhanced filtering with OR logic: (company match OR tool-initiated)
        emails_by_company = {}
        tool_originated_emails = []
        all_filtered_emails = []
        
        for email in emails_response.emails:
            # Check if message is tool-originated
            is_tool_originated = email.id in tool_originated_map
            tool_message = tool_originated_map.get(email.id)
            
            # Extract domain from sender email
            sender_email = email.sender
            if '<' in sender_email:
                sender_email = sender_email.split('<')[1].split('>')[0]
            
            # Check for company match using flexible domain matching
            matched_company = None
            for company, company_domains in company_domain_map.items():
                # Try exact domain match first
                domain = sender_email.split('@')[-1].lower() if '@' in sender_email else ''
                if any(domain == company_domain.lower() for company_domain in company_domains):
                    matched_company = company
                    break
                
                # Try flexible domain matching
                if gmail_service.flexible_domain_match(sender_email, company):
                    matched_company = company
                    break
            
            # Apply OR logic: include if (company match OR tool-initiated)
            should_include = matched_company is not None or is_tool_originated
            
            if should_include:
                # Create enhanced email object
                enhanced_email = EnhancedGmailEmail(
                    **email.dict(),
                    initiated_by_tool=is_tool_originated,
                    matched_company=matched_company,
                    tool_name=tool_message.tool_name if tool_message else None
                )
                
                all_filtered_emails.append(enhanced_email)
                
                if is_tool_originated:
                    tool_originated_emails.append(enhanced_email)
                    logger.info(f"✅ Tool-originated email included: {email.id} (tool: {tool_message.tool_name if tool_message else 'Unknown'})")
                
                if matched_company:
                    if matched_company not in emails_by_company:
                        emails_by_company[matched_company] = []
                    emails_by_company[matched_company].append(enhanced_email)
                    logger.info(f"✅ Email from {sender_email} matched to target company: {matched_company}")
            else:
                logger.info(f"❌ Email from {sender_email} filtered out (no company match and not tool-originated)")
        
        logger.info(f"Enhanced filtering results: {len(all_filtered_emails)} emails from {len(emails_response.emails)} total")
        logger.info(f"Tool-originated emails: {len(tool_originated_emails)}")
        logger.info(f"Company-matched emails: {sum(len(emails) for emails in emails_by_company.values())}")
        
        return EnhancedEmailsResponse(
            success=True,
            emails_by_company=emails_by_company,
            tool_originated_emails=tool_originated_emails,
            total_emails=len(all_filtered_emails),
            companies_found=list(emails_by_company.keys()),
            filtered_count=len(all_filtered_emails),
            original_count=len(emails_response.emails),
            target_companies=companies
        )
        
    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Error in enhanced email filtering: {error_msg}")
        
        # Handle scope mismatch errors
        if "scope mismatch" in error_msg.lower():
            await db.delete_gmail_connection(user_id)
            raise HTTPException(status_code=401, detail="Scope mismatch detected - please reconnect your Gmail account")
        
        raise HTTPException(status_code=500, detail=f"Failed to get emails by companies: {error_msg}")

@app.post("/api/v1/gmail/send", response_model=GmailSendResponse)
async def send_gmail_email(
    send_request: GmailSendRequest,
    current_user: dict = Depends(get_current_user),
    db: DatabaseService = Depends(get_db_service)
):
    """Send email via Gmail and automatically mark as tool-originated"""
    try:
        user_id = current_user.get("user_id", "demo-user")
        connection = await db.get_gmail_connection_by_user_id(user_id)
        
        if not connection:
            raise HTTPException(status_code=404, detail="Gmail not connected")
        
        if connection.status != GmailConnectionStatus.CONNECTED:
            raise HTTPException(status_code=400, detail="Gmail connection is not active")
        
        # Check if user has send permission
        if "https://www.googleapis.com/auth/gmail.send" not in connection.scopes:
            raise HTTPException(status_code=403, detail="Send permission not granted")
        
        send_response = await gmail_service.send_email(connection, send_request)
        
        # If email was sent successfully, mark it as tool-originated
        if send_response.success and send_response.message_id:
            try:
                tool_message = ToolOriginatedMessage(
                    user_id=user_id,
                    message_id=send_response.message_id,
                    thread_id=send_response.thread_id or send_response.message_id,
                    tool_name="ConnectorPro"
                )
                await db.create_tool_originated_message(tool_message)
                logger.info(f"Marked sent email as tool-originated: {send_response.message_id}")
            except Exception as e:
                logger.warning(f"Failed to mark sent email as tool-originated: {e}")
                # Don't fail the send operation if marking fails
        
        return send_response
        
    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Error sending Gmail email: {error_msg}")
        
        # Handle scope mismatch errors
        if "scope mismatch" in error_msg.lower():
            # Clear the invalid connection
            await db.delete_gmail_connection(user_id)
            return GmailSendResponse(
                success=False,
                message="Scope mismatch detected - please reconnect your Gmail account"
            )
        
        return GmailSendResponse(
            success=False,
            message=f"Failed to send email: {error_msg}"
        )

@app.get("/api/v1/gmail/callback")
async def gmail_oauth_callback(
    code: str = Query(...),
    state: str = Query(...),
    error: Optional[str] = Query(None),
    db: DatabaseService = Depends(get_db_service)
):
    """Handle Gmail OAuth2 callback"""
    try:
        if error:
            logger.error(f"OAuth error: {error}")
            return {
                "success": False,
                "message": f"OAuth authorization failed: {error}",
                "redirect_url": "http://localhost:5140/settings?gmail_error=oauth_denied"
            }
        
        if not code or not state:
            raise HTTPException(status_code=400, detail="Missing authorization code or state")
        
        # State contains the user_id
        user_id = state
        
        # Create auth request object
        auth_request = GmailAuthRequest(
            authorization_code=code,
            redirect_uri=os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/api/v1/gmail/callback")
        )
        
        # Exchange code for tokens
        connection = await gmail_service.exchange_code_for_tokens(auth_request, user_id)
        
        # Check if connection already exists
        existing_connection = await db.get_gmail_connection_by_user_id(user_id)
        
        if existing_connection:
            # Update existing connection
            connection_data = connection.dict(exclude={'id'})
            updated_connection = await db.update_gmail_connection(user_id, connection_data)
            connection = updated_connection or connection
        else:
            # Create new connection
            connection = await db.create_gmail_connection(connection)
        
        logger.info(f"Successfully connected Gmail for user {user_id}: {connection.email_address}")
        
        # Return JSON response for the callback page to handle
        return {
            "success": True,
            "message": f"Successfully connected Gmail account: {connection.email_address}",
            "redirect_url": "http://localhost:5140/settings?gmail_success=connected",
            "connection": {
                "email_address": connection.email_address,
                "status": connection.status.value,
                "last_connected": connection.last_connected.isoformat()
            }
        }
        
    except Exception as e:
        logger.error(f"Error in Gmail OAuth callback: {e}")
        return {
            "success": False,
            "message": f"Failed to connect Gmail: {str(e)}",
            "redirect_url": "http://localhost:5140/settings?gmail_error=connection_failed"
        }

@app.post("/api/v1/gmail/clear-invalid-tokens")
async def clear_invalid_gmail_tokens(
    current_user: dict = Depends(get_current_user),
    db: DatabaseService = Depends(get_db_service)
):
    """Clear Gmail connections with invalid or mismatched scopes"""
    try:
        cleared_count = await gmail_service.clear_invalid_tokens(db)
        return {
            "success": True,
            "message": f"Cleared {cleared_count} invalid Gmail connections",
            "cleared_count": cleared_count
        }
    except Exception as e:
        logger.error(f"Error clearing invalid tokens: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to clear invalid tokens: {str(e)}")

# TARGET COMPANIES MANAGEMENT ENDPOINTS

@app.get("/api/v1/target-companies", response_model=TargetCompanyResponse)
async def get_target_companies(
    current_user: dict = Depends(get_current_user),
    db: DatabaseService = Depends(get_db_service)
):
    """Get user's configured target companies"""
    try:
        user_id = current_user.get("user_id", "demo-user")
        companies = await db.get_target_companies_by_user_id(user_id)
        
        # DEBUG LOGGING: Log target companies data for debugging
        logger.info(f"🔍 DEBUG - Target Companies API called for user {user_id}")
        logger.info(f"🔍 DEBUG - Found {len(companies)} target companies in database:")
        for company in companies:
            logger.info(f"🔍 DEBUG - Company: {company.company_name} (ID: {company.id})")
        
        return TargetCompanyResponse(
            success=True,
            message=f"Retrieved {len(companies)} target companies",
            companies=companies
        )
    except Exception as e:
        logger.error(f"Error getting target companies: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get target companies: {str(e)}")

@app.post("/api/v1/target-companies", response_model=TargetCompanyResponse)
async def add_target_company(
    request: TargetCompanyRequest,
    current_user: dict = Depends(get_current_user),
    db: DatabaseService = Depends(get_db_service)
):
    """Add a new target company for the user"""
    try:
        user_id = current_user.get("user_id", "demo-user")
        
        # Check if company already exists for this user
        existing_companies = await db.get_target_companies_by_user_id(user_id)
        if any(tc.company_name.lower() == request.company_name.lower() for tc in existing_companies):
            raise HTTPException(status_code=409, detail="Target company already exists")
        
        # Create new target company
        target_company = UserTargetCompany(
            user_id=user_id,
            company_name=request.company_name,
            company_domains=request.company_domains or []
        )
        
        created_company = await db.create_target_company(target_company)
        
        return TargetCompanyResponse(
            success=True,
            message=f"Successfully added target company: {request.company_name}",
            companies=[created_company]
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding target company: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to add target company: {str(e)}")

@app.put("/api/v1/target-companies/{company_id}", response_model=TargetCompanyResponse)
async def update_target_company(
    company_id: str,
    request: TargetCompanyRequest,
    current_user: dict = Depends(get_current_user),
    db: DatabaseService = Depends(get_db_service)
):
    """Update a target company"""
    try:
        user_id = current_user.get("user_id", "demo-user")
        
        # Verify the company belongs to the user
        existing_companies = await db.get_target_companies_by_user_id(user_id)
        target_company = next((tc for tc in existing_companies if tc.id == company_id), None)
        
        if not target_company:
            raise HTTPException(status_code=404, detail="Target company not found")
        
        # Update the company
        update_data = {
            "company_name": request.company_name,
            "company_domains": request.company_domains or [],
            "updated_at": datetime.now()
        }
        
        updated_company = await db.update_target_company(company_id, update_data)
        
        if not updated_company:
            raise HTTPException(status_code=404, detail="Target company not found")
        
        return TargetCompanyResponse(
            success=True,
            message=f"Successfully updated target company: {request.company_name}",
            companies=[updated_company]
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating target company: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update target company: {str(e)}")

@app.delete("/api/v1/target-companies/{company_id}")
async def delete_target_company(
    company_id: str,
    current_user: dict = Depends(get_current_user),
    db: DatabaseService = Depends(get_db_service)
):
    """Delete a target company"""
    try:
        user_id = current_user.get("user_id", "demo-user")
        
        # Verify the company belongs to the user
        existing_companies = await db.get_target_companies_by_user_id(user_id)
        target_company = next((tc for tc in existing_companies if tc.id == company_id), None)
        
        if not target_company:
            raise HTTPException(status_code=404, detail="Target company not found")
        
        success = await db.delete_target_company(company_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Target company not found")
        
        return {"message": f"Successfully deleted target company: {target_company.company_name}"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting target company: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete target company: {str(e)}")

@app.post("/api/v1/target-companies/bulk")
async def set_target_companies_bulk(
    companies: List[TargetCompanyRequest],
    current_user: dict = Depends(get_current_user),
    db: DatabaseService = Depends(get_db_service)
):
    """Set target companies in bulk (replaces all existing companies)"""
    try:
        user_id = current_user.get("user_id", "demo-user")
        
        # Delete all existing target companies for the user
        await db.delete_target_companies_by_user_id(user_id)
        
        # Create new target companies
        created_companies = []
        for company_request in companies:
            target_company = UserTargetCompany(
                user_id=user_id,
                company_name=company_request.company_name,
                company_domains=company_request.company_domains or []
            )
            created_company = await db.create_target_company(target_company)
            created_companies.append(created_company)
        
        return TargetCompanyResponse(
            success=True,
            message=f"Successfully set {len(created_companies)} target companies",
            companies=created_companies
        )
    except Exception as e:
        logger.error(f"Error setting target companies in bulk: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to set target companies: {str(e)}")


# TOOL-ORIGINATED MESSAGES ENDPOINTS

@app.post("/api/v1/gmail/mark-tool-originated")
async def mark_message_as_tool_originated(
    message_id: str,
    thread_id: str,
    tool_name: str = "ConnectorPro",
    current_user: dict = Depends(get_current_user),
    db: DatabaseService = Depends(get_db_service)
):
    """Mark a Gmail message as tool-originated"""
    try:
        user_id = current_user.get("user_id", "demo-user")
        
        # Check if already marked
        existing = await db.is_message_tool_originated(user_id, message_id)
        if existing:
            return {"message": "Message already marked as tool-originated", "existing": True}
        
        # Create tool-originated message record
        tool_message = ToolOriginatedMessage(
            user_id=user_id,
            message_id=message_id,
            thread_id=thread_id,
            tool_name=tool_name
        )
        
        created_message = await db.create_tool_originated_message(tool_message)
        
        return {
            "success": True,
            "message": f"Successfully marked message as tool-originated",
            "tool_message": created_message.dict()
        }
    except Exception as e:
        logger.error(f"Error marking message as tool-originated: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to mark message: {str(e)}")

@app.get("/api/v1/gmail/tool-originated-messages")
async def get_tool_originated_messages(
    current_user: dict = Depends(get_current_user),
    db: DatabaseService = Depends(get_db_service)
):
    """Get all tool-originated messages for the user"""
    try:
        user_id = current_user.get("user_id", "demo-user")
        messages = await db.get_tool_originated_messages_by_user_id(user_id)
        
        return {
            "success": True,
            "messages": [msg.dict() for msg in messages],
            "total": len(messages)
        }
    except Exception as e:
        logger.error(f"Error getting tool-originated messages: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get tool-originated messages: {str(e)}")

# GOOGLE CALENDAR INTEGRATION ENDPOINTS

@app.get("/api/v1/calendar/auth-url", response_model=GmailConnectionResponse)
async def get_calendar_auth_url(current_user: dict = Depends(get_current_user)):
    """Get Google Calendar OAuth2 authorization URL"""
    try:
        user_id = current_user.get("user_id", "demo-user")
        auth_url = calendar_service.get_authorization_url(user_id)
        
        return GmailConnectionResponse(
            success=True,
            message="Calendar authorization URL generated successfully",
            auth_url=auth_url
        )
    except Exception as e:
        logger.error(f"Error generating Calendar auth URL: {e}")
        return GmailConnectionResponse(
            success=False,
            message=f"Failed to generate authorization URL: {str(e)}"
        )

@app.post("/api/v1/calendar/connect", response_model=GmailConnectionResponse)
async def connect_calendar(
    auth_request: GmailAuthRequest,
    current_user: dict = Depends(get_current_user),
    db: DatabaseService = Depends(get_db_service)
):
    """Connect Google Calendar account using authorization code"""
    try:
        user_id = current_user.get("user_id", "demo-user")
        
        # Exchange code for tokens
        connection = await calendar_service.exchange_code_for_tokens(auth_request, user_id)
        
        # Check if connection already exists
        existing_connection = await db.get_calendar_connection_by_user_id(user_id)
        
        if existing_connection:
            # Update existing connection
            connection_data = connection.dict(exclude={'id'})
            updated_connection = await db.update_calendar_connection(user_id, connection_data)
            connection = updated_connection or connection
        else:
            # Create new connection
            connection = await db.create_calendar_connection(connection)
        
        logger.info(f"Successfully connected Calendar for user {user_id}: {connection.email_address}")
        
        return GmailConnectionResponse(
            success=True,
            message=f"Successfully connected Google Calendar: {connection.email_address}",
            connection={
                "email_address": connection.email_address,
                "status": connection.status.value,
                "last_connected": connection.last_connected.isoformat(),
                "scopes": connection.scopes
            }
        )
        
    except Exception as e:
        logger.error(f"Error connecting Calendar: {e}")
        return GmailConnectionResponse(
            success=False,
            message=f"Failed to connect Calendar: {str(e)}"
        )

@app.get("/api/v1/calendar/status", response_model=GmailStatusResponse)
async def get_calendar_status(
    current_user: dict = Depends(get_current_user),
    db: DatabaseService = Depends(get_db_service)
):
    """Get Google Calendar connection status"""
    try:
        user_id = current_user.get("user_id", "demo-user")
        connection = await db.get_calendar_connection_by_user_id(user_id)
        
        if not connection:
            return GmailStatusResponse(
                status=GmailConnectionStatus.NOT_CONNECTED
            )
        
        # Check for scope mismatch first
        if not calendar_service._scopes_match(connection.scopes, calendar_service.default_scopes):
            logger.warning(f"Calendar scope mismatch detected for user {user_id}. Current: {connection.scopes}, Required: {calendar_service.default_scopes}")
            # Clear the invalid connection
            await db.delete_calendar_connection(user_id)
            return GmailStatusResponse(
                status=GmailConnectionStatus.NOT_CONNECTED,
                error_message="Scope mismatch detected - please reconnect your Google Calendar"
            )
        
        # Check if token is expired
        if datetime.now() >= connection.token_expires_at:
            try:
                # Try to refresh token
                connection = await calendar_service.refresh_access_token(connection)
                await db.update_calendar_connection(user_id, connection.dict(exclude={'id'}))
            except Exception as e:
                logger.error(f"Failed to refresh Calendar token: {e}")
                if "scope mismatch" in str(e).lower():
                    await db.delete_calendar_connection(user_id)
                    return GmailStatusResponse(
                        status=GmailConnectionStatus.NOT_CONNECTED,
                        error_message="Scope mismatch detected - please reconnect your Google Calendar"
                    )
                connection.status = GmailConnectionStatus.EXPIRED
                await db.update_calendar_connection(user_id, {"status": GmailConnectionStatus.EXPIRED})
        
        return GmailStatusResponse(
            status=connection.status,
            email_address=connection.email_address,
            last_connected=connection.last_connected,
            scopes=connection.scopes,
            error_message=connection.error_message
        )
        
    except Exception as e:
        logger.error(f"Error getting Calendar status: {e}")
        return GmailStatusResponse(
            status=GmailConnectionStatus.ERROR,
            error_message=str(e)
        )

@app.delete("/api/v1/calendar/disconnect")
async def disconnect_calendar(
    current_user: dict = Depends(get_current_user),
    db: DatabaseService = Depends(get_db_service)
):
    """Disconnect Google Calendar account"""
    try:
        user_id = current_user.get("user_id", "demo-user")
        success = await db.delete_calendar_connection(user_id)
        
        if success:
            return {"message": "Google Calendar disconnected successfully"}
        else:
            raise HTTPException(status_code=404, detail="No Calendar connection found")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error disconnecting Calendar: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to disconnect Calendar: {str(e)}")

@app.get("/api/v1/calendar/callback")
async def calendar_oauth_callback(
    code: str = Query(...),
    state: str = Query(...),
    error: Optional[str] = Query(None),
    db: DatabaseService = Depends(get_db_service)
):
    """Handle Google Calendar OAuth2 callback"""
    try:
        if error:
            logger.error(f"Calendar OAuth error: {error}")
            return {
                "success": False,
                "message": f"Calendar authorization failed: {error}",
                "redirect_url": "http://localhost:5137/settings?calendar_error=oauth_denied"
            }
        
        if not code or not state:
            raise HTTPException(status_code=400, detail="Missing authorization code or state")
        
        # State contains the user_id
        user_id = state
        
        # Create auth request object
        auth_request = GmailAuthRequest(
            authorization_code=code,
            redirect_uri=os.getenv("GOOGLE_CALENDAR_REDIRECT_URI", "http://localhost:8000/api/v1/calendar/callback")
        )
        
        # Exchange code for tokens
        connection = await calendar_service.exchange_code_for_tokens(auth_request, user_id)
        
        # Check if connection already exists
        existing_connection = await db.get_calendar_connection_by_user_id(user_id)
        
        if existing_connection:
            # Update existing connection
            connection_data = connection.dict(exclude={'id'})
            updated_connection = await db.update_calendar_connection(user_id, connection_data)
            connection = updated_connection or connection
        else:
            # Create new connection
            connection = await db.create_calendar_connection(connection)
        
        logger.info(f"Successfully connected Calendar for user {user_id}: {connection.email_address}")
        
        # Return JSON response for the callback page to handle
        return {
            "success": True,
            "message": f"Successfully connected Google Calendar: {connection.email_address}",
            "redirect_url": "http://localhost:5137/settings?calendar_success=connected",
            "connection": {
                "email_address": connection.email_address,
                "status": connection.status.value,
                "last_connected": connection.last_connected.isoformat()
            }
        }
        
    except Exception as e:
        logger.error(f"Error in Calendar OAuth callback: {e}")
        return {
            "success": False,
            "message": f"Failed to connect Calendar: {str(e)}",
            "redirect_url": "http://localhost:5137/settings?calendar_error=connection_failed"
        }

@app.get("/api/v1/calendar/calendars")
async def get_calendars(
    current_user: dict = Depends(get_current_user),
    db: DatabaseService = Depends(get_db_service)
):
    """Get user's calendars"""
    try:
        user_id = current_user.get("user_id", "demo-user")
        connection = await db.get_calendar_connection_by_user_id(user_id)
        
        if not connection:
            raise HTTPException(status_code=404, detail="Calendar not connected")
        
        if connection.status != GmailConnectionStatus.CONNECTED:
            raise HTTPException(status_code=400, detail="Calendar connection is not active")
        
        calendars = await calendar_service.list_calendars(connection)
        
        return {"calendars": calendars}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting calendars: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get calendars: {str(e)}")

@app.post("/api/v1/calendar/events")
async def create_calendar_event(
    event_data: dict,
    current_user: dict = Depends(get_current_user),
    db: DatabaseService = Depends(get_db_service)
):
    """Create a calendar event"""
    try:
        user_id = current_user.get("user_id", "demo-user")
        connection = await db.get_calendar_connection_by_user_id(user_id)
        
        if not connection:
            raise HTTPException(status_code=404, detail="Calendar not connected")
        
        if connection.status != GmailConnectionStatus.CONNECTED:
            raise HTTPException(status_code=400, detail="Calendar connection is not active")
        
        event = await calendar_service.create_event(connection, event_data)
        
        return {"success": True, "event": event}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating calendar event: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create event: {str(e)}")

@app.post("/api/v1/calendar/clear-invalid-tokens")
async def clear_invalid_calendar_tokens(
    current_user: dict = Depends(get_current_user),
    db: DatabaseService = Depends(get_db_service)
):
    """Clear Calendar connections with invalid or mismatched scopes"""
    try:
        cleared_count = await calendar_service.clear_invalid_tokens(db)
        return {
            "success": True,
            "message": f"Cleared {cleared_count} invalid Calendar connections",
            "cleared_count": cleared_count
        }
    except Exception as e:
        logger.error(f"Error clearing invalid calendar tokens: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to clear invalid tokens: {str(e)}")

# NETWORK QUERY LLM ENDPOINTS

@app.post("/api/v1/network/query", response_model=NetworkQueryResponse)
async def process_network_query(
    request: NetworkQueryRequest,
    current_user: dict = Depends(get_current_user),
    db: DatabaseService = Depends(get_db_service)
):
    """Process natural language queries about network data using LLM"""
    start_time = time.time()
    
    try:
        user_id = current_user.get("user_id", "demo-user")
        
        # Build context about available data
        context = NetworkDataContext()
        
        # Get basic stats
        try:
            context.total_contacts = await db.count_contacts()
            
            # Get target companies
            target_companies = await db.get_target_companies_by_user_id(user_id)
            context.target_companies = [tc.company_name for tc in target_companies]
            
            # Get company count (approximate)
            pipeline = [
                {"$match": {"degree": 1}},
                {"$group": {"_id": "$company"}},
                {"$count": "total"}
            ]
            result = await db.contacts_collection.aggregate(pipeline).to_list(length=1)
            context.total_companies = result[0]["total"] if result else 0
            
        except Exception as e:
            logger.warning(f"Failed to build complete context: {e}")
            # Continue with partial context
        
        # Create LLM query
        llm_query = LLMQuery(
            query=request.query,
            user_id=user_id,
            conversation_history=request.conversation_history or []
        )
        
        # Process with LLM
        provider = None
        if request.provider:
            try:
                provider = LLMProvider(request.provider.lower())
            except ValueError:
                logger.warning(f"Invalid provider '{request.provider}', using default")
        
        llm_response = await llm_service.process_query(llm_query, context, provider)
        
        # Execute the API calls suggested by the LLM
        data = await _execute_api_calls(llm_response.api_calls, user_id, db)
        
        processing_time = time.time() - start_time
        
        return NetworkQueryResponse(
            success=True,
            query_type=llm_response.query_type.value,
            title=llm_response.title,
            summary=llm_response.summary,
            visualization_type=llm_response.visualization_type.value,
            data=data,
            confidence=llm_response.confidence,
            reasoning=llm_response.reasoning,
            provider_used=llm_service.providers.get(provider or llm_service.default_provider, {}).get_provider_name() if llm_service.providers else "Fallback",
            processing_time=processing_time
        )
        
    except Exception as e:
        processing_time = time.time() - start_time
        logger.error(f"Error processing network query: {e}")
        
        return NetworkQueryResponse(
            success=False,
            query_type="error",
            title="Query Processing Error",
            summary="Failed to process your query. Please try again.",
            visualization_type="text",
            data=None,
            confidence=0.0,
            error_message=str(e),
            processing_time=processing_time
        )

async def _execute_api_calls(api_calls: List[Dict[str, Any]], user_id: str, db: DatabaseService) -> Any:
    """Execute the API calls suggested by the LLM and return the data"""
    
    if not api_calls:
        return None
    
    # For now, execute the first API call (can be extended to handle multiple calls)
    api_call = api_calls[0]
    endpoint = api_call.get("endpoint", "")
    params = api_call.get("params", {})
    
    try:
        if endpoint == "/api/v1/contacts/grouped-by-company":
            # Get contacts grouped by company
            require_title = params.get("require_title", True)
            target_companies_only = params.get("target_companies_only", False)
            
            # Get user's target companies
            target_companies = await db.get_target_companies_by_user_id(user_id)
            company_names = [tc.company_name for tc in target_companies]
            
            # Build filters
            base_filters = {"degree": 1}
            
            if target_companies_only and company_names:
                base_filters["company"] = {"$in": company_names}
            
            if require_title:
                base_filters["title"] = {
                    "$exists": True,
                    "$ne": "",
                    "$not": {"$regex": "^\\s*$"}
                }
            
            # Group contacts by company
            pipeline = [
                {"$match": base_filters},
                {"$group": {
                    "_id": "$company",
                    "contacts": {"$push": "$$ROOT"},
                    "count": {"$sum": 1}
                }},
                {"$sort": {"count": -1}}
            ]
            
            # Apply limit if specified
            limit = params.get("limit")
            if limit:
                pipeline.append({"$limit": limit})
            
            cursor = db.contacts_collection.aggregate(pipeline)
            companies_data = {}
            
            async for group in cursor:
                company_name = group["_id"]
                contacts_data = group["contacts"]
                
                # Transform contacts
                contacts = []
                for doc in contacts_data:
                    doc['id'] = str(doc['_id'])
                    del doc['_id']
                    contacts.append(Contact(**doc).dict())
                
                companies_data[company_name] = contacts
            
            return companies_data
            
        elif endpoint == "/api/v1/contacts/stats":
            # Get contact statistics
            total_contacts = await db.count_contacts()
            
            # Get latest upload record
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
            
        elif endpoint == "/api/v1/contacts":
            # Get contacts with filtering
            filters = {}
            company = params.get("company")
            if company:
                filters["company"] = {"$regex": company, "$options": "i"}
            
            limit = params.get("limit", 100)
            contacts = await db.get_contacts(skip=0, limit=limit, filters=filters)
            
            return [contact.dict() for contact in contacts]
            
        else:
            logger.warning(f"Unknown endpoint in API call: {endpoint}")
            return None
            
    except Exception as e:
        logger.error(f"Error executing API call {endpoint}: {e}")
        return None

@app.get("/api/v1/network/providers")
async def get_available_llm_providers():
    """Get list of available LLM providers"""
    try:
        providers = llm_service.get_available_providers()
        return {
            "success": True,
            "providers": providers,
            "default_provider": llm_service.default_provider.value if llm_service.default_provider else None
        }
    except Exception as e:
        logger.error(f"Error getting LLM providers: {e}")
        return {
            "success": False,
            "providers": [],
            "error": str(e)
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