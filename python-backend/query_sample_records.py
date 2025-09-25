#!/usr/bin/env python3
"""
Script to query sample records from the MongoDB database
and display information about the imported CSV data.
"""

import asyncio
import os
import sys
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import logging
from datetime import datetime
from typing import List, Dict, Any
import json

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def connect_to_database():
    """Connect to MongoDB with optimized settings for timeout issues"""
    mongodb_uri = os.getenv("MONGODB_URI")
    if not mongodb_uri:
        raise ValueError("MONGODB_URI environment variable is not set")
    
    try:
        # Configure MongoDB client with optimized settings to avoid timeouts
        client = AsyncIOMotorClient(
            mongodb_uri,
            tlsAllowInvalidCertificates=True,
            serverSelectionTimeoutMS=10000,  # 10 seconds
            connectTimeoutMS=10000,          # 10 seconds
            socketTimeoutMS=30000,           # 30 seconds for queries
            maxPoolSize=10,                  # Limit connection pool
            minPoolSize=1,
            maxIdleTimeMS=30000,
            waitQueueTimeoutMS=10000
        )
        
        # Test the connection
        await client.admin.command('ping')
        logger.info("✅ Successfully connected to MongoDB Atlas")
        
        database = client.connectorpro
        return client, database
        
    except Exception as e:
        logger.error(f"❌ Failed to connect to MongoDB: {e}")
        raise

async def get_database_statistics(db):
    """Get statistics about the database collections"""
    try:
        # Get contacts collection stats
        contacts_count = await db.contacts.count_documents({})
        
        # Get file uploads collection stats
        uploads_count = await db.file_uploads.count_documents({})
        
        # Get latest upload info
        latest_upload = await db.file_uploads.find_one(
            {},
            sort=[("uploadedAt", -1)]
        )
        
        return {
            "total_contacts": contacts_count,
            "total_uploads": uploads_count,
            "latest_upload": latest_upload
        }
    except Exception as e:
        logger.error(f"Error getting database statistics: {e}")
        return None

async def get_sample_contacts(db, limit=10):
    """Get sample contacts from the database"""
    try:
        # Get sample contacts with timeout protection
        cursor = db.contacts.find({}).limit(limit)
        contacts = []
        
        async for doc in cursor:
            # Convert ObjectId to string for JSON serialization
            doc['id'] = str(doc['_id'])
            del doc['_id']
            
            # Convert datetime objects to ISO strings
            for field in ['addedAt', 'lastContact', 'createdAt', 'updatedAt']:
                if field in doc and doc[field]:
                    if isinstance(doc[field], datetime):
                        doc[field] = doc[field].isoformat()
            
            contacts.append(doc)
        
        return contacts
    except Exception as e:
        logger.error(f"Error getting sample contacts: {e}")
        return []

async def get_field_analysis(db):
    """Analyze the fields present in the contacts collection"""
    try:
        # Get a sample of documents to analyze field structure
        sample_docs = await db.contacts.find({}).limit(100).to_list(length=100)
        
        if not sample_docs:
            return {"message": "No documents found"}
        
        # Analyze field presence and types
        field_analysis = {}
        total_docs = len(sample_docs)
        
        for doc in sample_docs:
            for field, value in doc.items():
                if field == '_id':
                    continue
                    
                if field not in field_analysis:
                    field_analysis[field] = {
                        'count': 0,
                        'types': set(),
                        'sample_values': []
                    }
                
                field_analysis[field]['count'] += 1
                field_analysis[field]['types'].add(type(value).__name__)
                
                # Store sample values (limit to avoid memory issues)
                if len(field_analysis[field]['sample_values']) < 3 and value:
                    field_analysis[field]['sample_values'].append(str(value)[:100])
        
        # Convert sets to lists for JSON serialization
        for field_info in field_analysis.values():
            field_info['types'] = list(field_info['types'])
            field_info['percentage'] = round((field_info['count'] / total_docs) * 100, 1)
        
        return field_analysis
    except Exception as e:
        logger.error(f"Error analyzing fields: {e}")
        return {"error": str(e)}

async def main():
    """Main function to query and display sample records"""
    print("🔍 ConnectorPro Database Query Tool")
    print("=" * 50)
    
    client = None
    try:
        # Connect to database
        print("📡 Connecting to MongoDB...")
        client, db = await connect_to_database()
        
        # Get database statistics
        print("\n📊 Database Statistics:")
        print("-" * 30)
        stats = await get_database_statistics(db)
        
        if stats:
            print(f"Total Contacts: {stats['total_contacts']:,}")
            print(f"Total File Uploads: {stats['total_uploads']}")
            
            if stats['latest_upload']:
                upload = stats['latest_upload']
                print(f"\nLatest Upload:")
                print(f"  File: {upload.get('fileName', 'Unknown')}")
                print(f"  Status: {upload.get('status', 'Unknown')}")
                print(f"  Contacts Imported: {upload.get('contactsImported', 0):,}")
                print(f"  Total Rows: {upload.get('totalRows', 0):,}")
                print(f"  Upload Date: {upload.get('uploadedAt', 'Unknown')}")
        
        # Get field analysis
        print("\n🔍 Field Analysis:")
        print("-" * 30)
        field_analysis = await get_field_analysis(db)
        
        if 'error' not in field_analysis:
            for field, info in sorted(field_analysis.items()):
                print(f"{field}:")
                print(f"  Present in {info['percentage']}% of records ({info['count']} docs)")
                print(f"  Types: {', '.join(info['types'])}")
                if info['sample_values']:
                    print(f"  Sample values: {', '.join(info['sample_values'][:2])}")
                print()
        else:
            print(f"Error analyzing fields: {field_analysis['error']}")
        
        # Get sample contacts
        print("\n📋 Sample Records (First 5):")
        print("-" * 30)
        sample_contacts = await get_sample_contacts(db, limit=5)
        
        if sample_contacts:
            for i, contact in enumerate(sample_contacts, 1):
                print(f"\n📝 Record {i}:")
                print(f"  ID: {contact.get('id', 'N/A')}")
                print(f"  Name: {contact.get('name', 'N/A')}")
                print(f"  Title: {contact.get('title', 'N/A')}")
                print(f"  Company: {contact.get('company', 'N/A')}")
                print(f"  Email: {contact.get('email', 'N/A')}")
                print(f"  Phone: {contact.get('phone', 'N/A')}")
                print(f"  LinkedIn URL: {contact.get('linkedinUrl', 'N/A')}")
                print(f"  Degree: {contact.get('degree', 'N/A')}")
                print(f"  Relationship Strength: {contact.get('relationshipStrength', 'N/A')}")
                print(f"  Tags: {contact.get('tags', [])}")
                print(f"  Notes: {contact.get('notes', 'N/A')[:100]}{'...' if len(str(contact.get('notes', ''))) > 100 else ''}")
                print(f"  Added At: {contact.get('addedAt', 'N/A')}")
                print(f"  Created At: {contact.get('createdAt', 'N/A')}")
        else:
            print("❌ No sample contacts found")
        
        # Get more detailed sample for JSON export
        print("\n💾 Detailed Sample (JSON format):")
        print("-" * 30)
        detailed_sample = await get_sample_contacts(db, limit=3)
        if detailed_sample:
            print(json.dumps(detailed_sample, indent=2, default=str))
        
        print(f"\n✅ Query completed successfully!")
        print(f"📈 Found {stats['total_contacts'] if stats else 0} total contacts in database")
        
    except Exception as e:
        logger.error(f"❌ Error during database query: {e}")
        print(f"\n❌ Error: {e}")
        sys.exit(1)
    
    finally:
        if client:
            client.close()
            print("\n🔌 Database connection closed")

if __name__ == "__main__":
    asyncio.run(main())