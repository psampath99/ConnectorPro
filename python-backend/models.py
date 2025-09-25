from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum

class ContactDegree(int, Enum):
    FIRST = 1
    SECOND = 2
    THIRD = 3

class RelationshipStrength(str, Enum):
    WEAK = "weak"
    MEDIUM = "medium"
    STRONG = "strong"

class UploadStatus(str, Enum):
    SUCCESS = "success"
    FAILED = "failed"
    PROCESSING = "processing"

class UploadSource(str, Enum):
    CSV = "csv"
    LINKEDIN = "linkedin"
    GMAIL = "gmail"
    MANUAL = "manual"

class GmailConnectionStatus(str, Enum):
    CONNECTED = "connected"
    NOT_CONNECTED = "not_connected"
    ERROR = "error"
    EXPIRED = "expired"

class GmailScope(str, Enum):
    READONLY = "https://www.googleapis.com/auth/gmail.readonly"
    SEND = "https://www.googleapis.com/auth/gmail.send"
    COMPOSE = "https://www.googleapis.com/auth/gmail.compose"
    MODIFY = "https://www.googleapis.com/auth/gmail.modify"
    USERINFO_EMAIL = "https://www.googleapis.com/auth/userinfo.email"

class Contact(BaseModel):
    id: Optional[str] = None
    name: str
    title: Optional[str] = None
    company: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    linkedinUrl: Optional[str] = None
    degree: Optional[ContactDegree] = ContactDegree.SECOND
    relationshipStrength: Optional[RelationshipStrength] = RelationshipStrength.MEDIUM
    commonalities: Optional[List[str]] = []
    notes: Optional[str] = ""
    tags: Optional[List[str]] = []
    addedAt: Optional[datetime] = Field(default_factory=datetime.now)
    lastContact: Optional[datetime] = None
    linkedinData: Optional[Dict[str, Any]] = {}
    createdAt: Optional[datetime] = Field(default_factory=datetime.now)
    updatedAt: Optional[datetime] = Field(default_factory=datetime.now)

class FileUploadRecord(BaseModel):
    id: Optional[str] = None
    fileName: str
    fileSize: int
    fileType: str
    uploadSource: UploadSource
    contactsImported: int = 0
    totalRows: int = 0
    status: UploadStatus
    errorMessage: Optional[str] = None
    uploadedAt: datetime = Field(default_factory=datetime.now)
    updatedAt: datetime = Field(default_factory=datetime.now)
    metadata: Optional[Dict[str, Any]] = {}

class CSVImportRequest(BaseModel):
    overwriteExisting: Optional[bool] = False

class LinkedInImportRequest(BaseModel):
    accessToken: str
    count: Optional[int] = 500
    lastImportDate: Optional[str] = None

class ContactsResponse(BaseModel):
    contacts: List[Contact]
    total: int
    page: int
    limit: int

class ImportResponse(BaseModel):
    success: bool
    message: str
    imported: int
    total: int
    contacts: Optional[List[Any]] = []  # Allow flexible contact data for frontend compatibility
    uploadId: Optional[str] = None
    processingDuration: Optional[float] = None
    errors: Optional[List[str]] = []

class FileUploadsResponse(BaseModel):
    uploads: List[FileUploadRecord]
    total: int

class LinkedInStatusResponse(BaseModel):
    status: str
    message: str
    configured: bool = False

# Gmail Integration Models
class GmailConnection(BaseModel):
    id: Optional[str] = None
    user_id: str
    email_address: str
    access_token: str  # Will be encrypted in database
    refresh_token: str  # Will be encrypted in database
    token_expires_at: datetime
    scopes: List[str]
    status: GmailConnectionStatus = GmailConnectionStatus.CONNECTED
    last_connected: datetime = Field(default_factory=datetime.now)
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    error_message: Optional[str] = None

class GmailEmail(BaseModel):
    id: str
    thread_id: str
    subject: str
    sender: str
    recipient: str
    date: datetime
    snippet: str
    body_text: Optional[str] = None
    body_html: Optional[str] = None
    labels: List[str] = []
    is_read: bool = False
    is_important: bool = False
    has_attachments: bool = False

class GmailAuthRequest(BaseModel):
    authorization_code: str
    redirect_uri: str

class GmailConnectionResponse(BaseModel):
    success: bool
    message: str
    connection: Optional[dict] = None
    auth_url: Optional[str] = None

class GmailStatusResponse(BaseModel):
    status: GmailConnectionStatus
    email_address: Optional[str] = None
    last_connected: Optional[datetime] = None
    scopes: Optional[List[str]] = None
    error_message: Optional[str] = None

class GmailEmailsResponse(BaseModel):
    emails: List[GmailEmail]
    total: int
    next_page_token: Optional[str] = None

class GmailSearchRequest(BaseModel):
    query: str
    max_results: Optional[int] = 10
    page_token: Optional[str] = None

class GmailSendRequest(BaseModel):
    to: str
    subject: str
    body: str
    body_type: str = "text"  # "text" or "html"
    cc: Optional[str] = None
    bcc: Optional[str] = None

class GmailSendResponse(BaseModel):
    success: bool
    message: str
    message_id: Optional[str] = None
    thread_id: Optional[str] = None

# Enhanced filtering models
class UserTargetCompany(BaseModel):
    id: Optional[str] = None
    user_id: str
    company_name: str
    company_domains: Optional[List[str]] = []  # Optional explicit domains
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

class ToolOriginatedMessage(BaseModel):
    id: Optional[str] = None
    user_id: str
    message_id: str  # Gmail message ID
    thread_id: str   # Gmail thread ID
    initiated_by_tool: bool = True
    tool_name: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.now)

class EnhancedGmailEmail(GmailEmail):
    """Extended Gmail email with filtering metadata"""
    initiated_by_tool: bool = False
    matched_company: Optional[str] = None
    tool_name: Optional[str] = None

class TargetCompanyRequest(BaseModel):
    company_name: str
    company_domains: Optional[List[str]] = []

class TargetCompanyResponse(BaseModel):
    success: bool
    message: str
    companies: Optional[List[UserTargetCompany]] = None

class EnhancedEmailsResponse(BaseModel):
    success: bool
    emails_by_company: Dict[str, List[EnhancedGmailEmail]]
    tool_originated_emails: List[EnhancedGmailEmail]
    total_emails: int
    companies_found: List[str]
    filtered_count: int
    original_count: int
    target_companies: List[str]