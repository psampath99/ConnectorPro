#!/usr/bin/env python3
"""
Script to set a user's password in the ConnectorPro database.
This script will hash the password using the same method as the registration process.
"""

import asyncio
import os
import sys
from motor.motor_asyncio import AsyncIOMotorClient
from user_models import UserService
from database import DatabaseService
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Database configuration
MONGODB_URL = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
DATABASE_NAME = os.getenv("DATABASE_NAME", "connectorpro")

async def set_user_password(email: str, new_password: str):
    """Set a user's password by email"""
    
    # Connect to MongoDB with SSL configuration
    client = AsyncIOMotorClient(MONGODB_URL, tlsAllowInvalidCertificates=True)
    database = client[DATABASE_NAME]
    db_service = DatabaseService(database)
    
    try:
        # Check if user exists
        user = await db_service.get_user_by_email(email)
        if not user:
            print(f"❌ User with email '{email}' not found.")
            return False
        
        print(f"✅ Found user: {user.name} ({user.email})")
        print(f"   User ID: {user.id}")
        print(f"   Current status: {user.status}")
        
        # Hash the new password using the same method as registration
        password_hash = UserService.hash_password(new_password)
        
        # Update the user's password
        update_data = {
            "password_hash": password_hash,
            "updated_at": datetime.now(),
            # Reset login attempts and unlock account if locked
            "login_attempts": 0,
            "locked_until": None
        }
        
        updated_user = await db_service.update_user(user.id, update_data)
        
        if updated_user:
            print(f"✅ Password successfully updated for {email}")
            print(f"   Password hash: {password_hash[:50]}...")
            print(f"   Updated at: {updated_user.updated_at}")
            return True
        else:
            print(f"❌ Failed to update password for {email}")
            return False
            
    except Exception as e:
        print(f"❌ Error setting password: {e}")
        return False
    finally:
        # Close database connection
        client.close()

async def create_user_if_not_exists(email: str, name: str, password: str):
    """Create a user if they don't exist"""
    
    # Connect to MongoDB with SSL configuration
    client = AsyncIOMotorClient(MONGODB_URL, tlsAllowInvalidCertificates=True)
    database = client[DATABASE_NAME]
    db_service = DatabaseService(database)
    
    try:
        # Check if user already exists
        existing_user = await db_service.get_user_by_email(email)
        if existing_user:
            print(f"✅ User already exists: {existing_user.name} ({existing_user.email})")
            return existing_user
        
        # Import User model
        from user_models import User, UserStatus, UserRole
        
        # Hash password
        password_hash = UserService.hash_password(password)
        
        # Create new user
        new_user = User(
            email=email,
            name=name,
            password_hash=password_hash,
            status=UserStatus.ACTIVE,
            role=UserRole.USER,
            email_verified=True,  # Set as verified for this admin operation
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        
        created_user = await db_service.create_user(new_user)
        print(f"✅ Created new user: {created_user.name} ({created_user.email})")
        print(f"   User ID: {created_user.id}")
        return created_user
        
    except Exception as e:
        print(f"❌ Error creating user: {e}")
        return None
    finally:
        client.close()

async def main():
    """Main function"""
    
    # Configuration
    target_email = "sampath.prema@gmail.com"
    target_name = "Sampath Prema"
    new_password = "TestPassword123"
    
    print("🔐 ConnectorPro Password Update Script")
    print("=" * 50)
    print(f"Target email: {target_email}")
    print(f"New password: {'*' * len(new_password)}")
    print(f"Database URL: {MONGODB_URL}")
    print(f"Database name: {DATABASE_NAME}")
    print(f"Environment MONGODB_URI: {os.getenv('MONGODB_URI', 'NOT_FOUND')}")
    print()
    
    # First, try to update existing user
    success = await set_user_password(target_email, new_password)
    
    if not success:
        print("\n🔄 User not found. Creating new user...")
        user = await create_user_if_not_exists(target_email, target_name, new_password)
        if user:
            print(f"✅ User created and password set successfully!")
            success = True
    
    if success:
        print("\n🎉 Operation completed successfully!")
        print(f"   User '{target_email}' can now login with password '{new_password}'")
        
        # Verify password works
        print("\n🔍 Verifying password...")
        client = AsyncIOMotorClient(MONGODB_URL, tlsAllowInvalidCertificates=True)
        database = client[DATABASE_NAME]
        db_service = DatabaseService(database)
        
        try:
            user = await db_service.get_user_by_email(target_email)
            if user and UserService.verify_password(new_password, user.password_hash):
                print("✅ Password verification successful!")
            else:
                print("❌ Password verification failed!")
        except Exception as e:
            print(f"❌ Error verifying password: {e}")
        finally:
            client.close()
    else:
        print("\n❌ Operation failed!")
        sys.exit(1)

if __name__ == "__main__":
    # Run the async main function
    asyncio.run(main())