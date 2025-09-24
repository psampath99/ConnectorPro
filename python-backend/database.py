from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from typing import List, Optional, Dict, Any
from models import Contact, FileUploadRecord
from bson import ObjectId
import logging

logger = logging.getLogger(__name__)

class DatabaseService:
    def __init__(self, database: AsyncIOMotorDatabase):
        self.db = database
        self.contacts_collection = database.contacts
        self.file_uploads_collection = database.file_uploads
    
    # Contact operations
    async def create_contact(self, contact: Contact) -> Contact:
        """Create a new contact"""
        contact_dict = contact.dict(exclude={'id'})
        result = await self.contacts_collection.insert_one(contact_dict)
        contact.id = str(result.inserted_id)
        return contact
    
    async def get_contacts(self, skip: int = 0, limit: int = 100, filters: Optional[Dict] = None) -> List[Contact]:
        """Get contacts with pagination and filtering"""
        query = filters or {}
        cursor = self.contacts_collection.find(query).skip(skip).limit(limit)
        contacts = []
        async for doc in cursor:
            doc['id'] = str(doc['_id'])
            del doc['_id']
            contacts.append(Contact(**doc))
        return contacts
    
    async def get_contact_by_id(self, contact_id: str) -> Optional[Contact]:
        """Get a contact by ID"""
        try:
            doc = await self.contacts_collection.find_one({"_id": ObjectId(contact_id)})
            if doc:
                doc['id'] = str(doc['_id'])
                del doc['_id']
                return Contact(**doc)
        except Exception as e:
            logger.error(f"Error getting contact by ID {contact_id}: {e}")
        return None
    
    async def update_contact(self, contact_id: str, contact_data: Dict) -> Optional[Contact]:
        """Update a contact"""
        try:
            result = await self.contacts_collection.update_one(
                {"_id": ObjectId(contact_id)},
                {"$set": contact_data}
            )
            if result.modified_count > 0:
                return await self.get_contact_by_id(contact_id)
        except Exception as e:
            logger.error(f"Error updating contact {contact_id}: {e}")
        return None
    
    async def delete_contact(self, contact_id: str) -> bool:
        """Delete a contact"""
        try:
            result = await self.contacts_collection.delete_one({"_id": ObjectId(contact_id)})
            return result.deleted_count > 0
        except Exception as e:
            logger.error(f"Error deleting contact {contact_id}: {e}")
            return False
    
    async def count_contacts(self, filters: Optional[Dict] = None) -> int:
        """Count contacts with optional filters"""
        query = filters or {}
        return await self.contacts_collection.count_documents(query)
    
    async def bulk_create_contacts(self, contacts: List[Contact]) -> List[Contact]:
        """Bulk create contacts"""
        if not contacts:
            return []
        
        contact_dicts = [contact.dict(exclude={'id'}) for contact in contacts]
        result = await self.contacts_collection.insert_many(contact_dicts)
        
        # Update contacts with their new IDs
        for i, contact in enumerate(contacts):
            contact.id = str(result.inserted_ids[i])
        
        return contacts
    
    async def find_duplicate_contacts(self, email: Optional[str] = None, linkedin_url: Optional[str] = None) -> List[Contact]:
        """Find duplicate contacts by email or LinkedIn URL"""
        query = {"$or": []}
        if email:
            query["$or"].append({"email": email})
        if linkedin_url:
            query["$or"].append({"linkedinUrl": linkedin_url})
        
        if not query["$or"]:
            return []
        
        cursor = self.contacts_collection.find(query)
        contacts = []
        async for doc in cursor:
            doc['id'] = str(doc['_id'])
            del doc['_id']
            contacts.append(Contact(**doc))
        return contacts
    
    # File upload operations
    async def create_file_upload_record(self, upload_record: FileUploadRecord) -> FileUploadRecord:
        """Create a file upload record"""
        record_dict = upload_record.dict(exclude={'id'})
        result = await self.file_uploads_collection.insert_one(record_dict)
        upload_record.id = str(result.inserted_id)
        return upload_record
    
    async def get_file_upload_records(self, skip: int = 0, limit: int = 100) -> List[FileUploadRecord]:
        """Get file upload records with pagination"""
        cursor = self.file_uploads_collection.find().sort("uploadedAt", -1).skip(skip).limit(limit)
        records = []
        async for doc in cursor:
            doc['id'] = str(doc['_id'])
            del doc['_id']
            records.append(FileUploadRecord(**doc))
        return records
    
    async def get_file_upload_record_by_id(self, record_id: str) -> Optional[FileUploadRecord]:
        """Get a file upload record by ID"""
        try:
            doc = await self.file_uploads_collection.find_one({"_id": ObjectId(record_id)})
            if doc:
                doc['id'] = str(doc['_id'])
                del doc['_id']
                return FileUploadRecord(**doc)
        except Exception as e:
            logger.error(f"Error getting file upload record by ID {record_id}: {e}")
        return None
    
    async def delete_file_upload_record(self, record_id: str) -> bool:
        """Delete a file upload record"""
        try:
            result = await self.file_uploads_collection.delete_one({"_id": ObjectId(record_id)})
            return result.deleted_count > 0
        except Exception as e:
            logger.error(f"Error deleting file upload record {record_id}: {e}")
            return False
    
    async def count_file_upload_records(self) -> int:
        """Count file upload records"""
        return await self.file_uploads_collection.count_documents({})