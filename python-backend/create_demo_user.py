#!/usr/bin/env python3
"""
Script to create a demo user account for testing
"""
import asyncio
import os
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from database import DatabaseService
from user_models import User, UserService
from datetime import datetime

# Load environment variables
load_dotenv()

async def create_demo_user():
    """Create demo user account"""
    try:
        # Connect to database
        mongodb_uri = os.getenv("MONGODB_URI")
        if not mongodb_uri:
            raise ValueError("MONGODB_URI environment variable not set")
        
        client = AsyncIOMotorClient(mongodb_uri, tlsAllowInvalidCertificates=True)
        database = client.connectorpro
        
        # Test connection
        await client.admin.command('ping')
        print("✅ Database connection established")
        
        # Initialize database service
        db_service = DatabaseService(database)
        
        # Check if user already exists
        existing_user = await db_service.get_user_by_email("sampath.prema@gmail.com")
        if existing_user:
            print("✅ Demo user already exists")
            print(f"   Email: {existing_user.email}")
            print(f"   Name: {existing_user.name}")
            print(f"   ID: {existing_user.id}")
            return existing_user
        
        # Create demo user
        password_hash = UserService.hash_password("TestPassword123!")
        
        demo_user = User(
            email="sampath.prema@gmail.com",
            name="Sampath Prema",
            password_hash=password_hash,
            phone="+1-555-0123",
            email_verified=True,  # Pre-verify for demo
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        
        # Save to database
        created_user = await db_service.create_user(demo_user)
        print("✅ Demo user created successfully!")
        print(f"   Email: {created_user.email}")
        print(f"   Name: {created_user.name}")
        print(f"   ID: {created_user.id}")
        print(f"   Password: TestPassword123!")
        
        return created_user
        
    except Exception as e:
        print(f"❌ Error creating demo user: {e}")
        raise
    finally:
        if 'client' in locals():
            client.close()

if __name__ == "__main__":
    asyncio.run(create_demo_user())