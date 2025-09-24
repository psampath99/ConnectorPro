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
    MANUAL = "manual"

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