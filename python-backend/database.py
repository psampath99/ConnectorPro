from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from typing import List, Optional, Dict, Any
from models import Contact, FileUploadRecord, GmailConnection, UserTargetCompany, ToolOriginatedMessage
from bson import ObjectId
import logging

logger = logging.getLogger(__name__)

class DatabaseService:
    def __init__(self, database: AsyncIOMotorDatabase):
        self.db = database
        self.contacts_collection = database.contacts
        self.file_uploads_collection = database.file_uploads
        self.gmail_connections_collection = database.gmail_connections
        self.calendar_connections_collection = database.calendar_connections
        self.target_companies_collection = database.target_companies
        self.tool_originated_messages_collection = database.tool_originated_messages
    
    # Contact operations
    async def create_contact(self, contact: Contact) -> Contact:
        """Create a new contact"""
        contact_dict = contact.dict(exclude={'id'})
        result = await self.contacts_collection.insert_one(contact_dict)
        contact.id = str(result.inserted_id)
        return contact
    
    async def get_contacts(self, skip: int = 0, limit: int = 100, filters: Optional[Dict] = None) -> List[Contact]:
        """Get contacts with pagination and filtering - only returns 1st degree connections"""
        query = filters or {}
        # Always filter to only 1st degree connections
        query["degree"] = 1
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
        """Count contacts with optional filters - only counts 1st degree connections"""
        query = filters or {}
        # Always filter to only 1st degree connections
        query["degree"] = 1
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
    
    # Gmail connection operations
    async def create_gmail_connection(self, connection: GmailConnection) -> GmailConnection:
        """Create a Gmail connection"""
        connection_dict = connection.dict(exclude={'id'})
        result = await self.gmail_connections_collection.insert_one(connection_dict)
        connection.id = str(result.inserted_id)
        return connection
    
    async def get_gmail_connection_by_user_id(self, user_id: str) -> Optional[GmailConnection]:
        """Get Gmail connection by user ID"""
        try:
            doc = await self.gmail_connections_collection.find_one({"user_id": user_id})
            if doc:
                doc['id'] = str(doc['_id'])
                del doc['_id']
                return GmailConnection(**doc)
        except Exception as e:
            logger.error(f"Error getting Gmail connection for user {user_id}: {e}")
        return None
    
    async def update_gmail_connection(self, user_id: str, connection_data: Dict) -> Optional[GmailConnection]:
        """Update a Gmail connection"""
        try:
            result = await self.gmail_connections_collection.update_one(
                {"user_id": user_id},
                {"$set": connection_data}
            )
            if result.modified_count > 0:
                return await self.get_gmail_connection_by_user_id(user_id)
        except Exception as e:
            logger.error(f"Error updating Gmail connection for user {user_id}: {e}")
        return None
    
    async def delete_gmail_connection(self, user_id: str) -> bool:
        """Delete a Gmail connection"""
        try:
            result = await self.gmail_connections_collection.delete_one({"user_id": user_id})
            return result.deleted_count > 0
        except Exception as e:
            logger.error(f"Error deleting Gmail connection for user {user_id}: {e}")
            return False
    
    # Calendar connection operations
    async def create_calendar_connection(self, connection: GmailConnection) -> GmailConnection:
        """Create a Calendar connection"""
        connection_dict = connection.dict(exclude={'id'})
        result = await self.calendar_connections_collection.insert_one(connection_dict)
        connection.id = str(result.inserted_id)
        return connection
    
    async def get_calendar_connection_by_user_id(self, user_id: str) -> Optional[GmailConnection]:
        """Get Calendar connection by user ID"""
        try:
            doc = await self.calendar_connections_collection.find_one({"user_id": user_id})
            if doc:
                doc['id'] = str(doc['_id'])
                del doc['_id']
                return GmailConnection(**doc)
        except Exception as e:
            logger.error(f"Error getting Calendar connection for user {user_id}: {e}")
        return None
    
    async def update_calendar_connection(self, user_id: str, connection_data: Dict) -> Optional[GmailConnection]:
        """Update a Calendar connection"""
        try:
            result = await self.calendar_connections_collection.update_one(
                {"user_id": user_id},
                {"$set": connection_data}
            )
            if result.modified_count > 0:
                return await self.get_calendar_connection_by_user_id(user_id)
        except Exception as e:
            logger.error(f"Error updating Calendar connection for user {user_id}: {e}")
        return None
    
    async def delete_calendar_connection(self, user_id: str) -> bool:
        """Delete a Calendar connection"""
        try:
            result = await self.calendar_connections_collection.delete_one({"user_id": user_id})
            return result.deleted_count > 0
        except Exception as e:
            logger.error(f"Error deleting Calendar connection for user {user_id}: {e}")
            return False
    
    # Target companies operations
    async def create_target_company(self, target_company: UserTargetCompany) -> UserTargetCompany:
        """Create a target company for a user"""
        company_dict = target_company.dict(exclude={'id'})
        result = await self.target_companies_collection.insert_one(company_dict)
        target_company.id = str(result.inserted_id)
        return target_company
    
    async def get_target_companies_by_user_id(self, user_id: str) -> List[UserTargetCompany]:
        """Get all target companies for a user"""
        try:
            cursor = self.target_companies_collection.find({"user_id": user_id})
            companies = []
            async for doc in cursor:
                doc['id'] = str(doc['_id'])
                del doc['_id']
                companies.append(UserTargetCompany(**doc))
            return companies
        except Exception as e:
            logger.error(f"Error getting target companies for user {user_id}: {e}")
            return []
    
    async def update_target_company(self, company_id: str, company_data: Dict) -> Optional[UserTargetCompany]:
        """Update a target company"""
        try:
            result = await self.target_companies_collection.update_one(
                {"_id": ObjectId(company_id)},
                {"$set": company_data}
            )
            if result.modified_count > 0:
                doc = await self.target_companies_collection.find_one({"_id": ObjectId(company_id)})
                if doc:
                    doc['id'] = str(doc['_id'])
                    del doc['_id']
                    return UserTargetCompany(**doc)
        except Exception as e:
            logger.error(f"Error updating target company {company_id}: {e}")
        return None
    
    async def delete_target_company(self, company_id: str) -> bool:
        """Delete a target company"""
        try:
            result = await self.target_companies_collection.delete_one({"_id": ObjectId(company_id)})
            return result.deleted_count > 0
        except Exception as e:
            logger.error(f"Error deleting target company {company_id}: {e}")
            return False
    
    async def delete_target_companies_by_user_id(self, user_id: str) -> int:
        """Delete all target companies for a user"""
        try:
            result = await self.target_companies_collection.delete_many({"user_id": user_id})
            return result.deleted_count
        except Exception as e:
            logger.error(f"Error deleting target companies for user {user_id}: {e}")
            return 0
    
    # Tool-originated messages operations
    async def create_tool_originated_message(self, message: ToolOriginatedMessage) -> ToolOriginatedMessage:
        """Create a tool-originated message record"""
        message_dict = message.dict(exclude={'id'})
        result = await self.tool_originated_messages_collection.insert_one(message_dict)
        message.id = str(result.inserted_id)
        return message
    
    async def get_tool_originated_messages_by_user_id(self, user_id: str) -> List[ToolOriginatedMessage]:
        """Get all tool-originated messages for a user"""
        try:
            cursor = self.tool_originated_messages_collection.find({"user_id": user_id})
            messages = []
            async for doc in cursor:
                doc['id'] = str(doc['_id'])
                del doc['_id']
                messages.append(ToolOriginatedMessage(**doc))
            return messages
        except Exception as e:
            logger.error(f"Error getting tool-originated messages for user {user_id}: {e}")
            return []
    
    async def is_message_tool_originated(self, user_id: str, message_id: str) -> Optional[ToolOriginatedMessage]:
        """Check if a message is tool-originated"""
        try:
            doc = await self.tool_originated_messages_collection.find_one({
                "user_id": user_id,
                "message_id": message_id
            })
            if doc:
                doc['id'] = str(doc['_id'])
                del doc['_id']
                return ToolOriginatedMessage(**doc)
        except Exception as e:
            logger.error(f"Error checking tool-originated message {message_id} for user {user_id}: {e}")
        return None
    
    async def bulk_check_tool_originated_messages(self, user_id: str, message_ids: List[str]) -> Dict[str, ToolOriginatedMessage]:
        """Bulk check if messages are tool-originated"""
        try:
            cursor = self.tool_originated_messages_collection.find({
                "user_id": user_id,
                "message_id": {"$in": message_ids}
            })
            result = {}
            async for doc in cursor:
                doc['id'] = str(doc['_id'])
                message_id = doc['message_id']
                del doc['_id']
                result[message_id] = ToolOriginatedMessage(**doc)
            return result
        except Exception as e:
            logger.error(f"Error bulk checking tool-originated messages for user {user_id}: {e}")
            return {}