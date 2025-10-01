import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

async def fix_user_ids():
    """Update all non-demo contacts to use demo-user-sampath user_id"""
    try:
        client = AsyncIOMotorClient(os.getenv('MONGODB_URI'), tlsAllowInvalidCertificates=True)
        db = client.connectorpro
        
        # First, let's see what user_ids exist
        print("Checking current user_ids...")
        
        # Count contacts by user_id
        demo_count = await db.contacts.count_documents({'user_id': 'demo-user-sampath'})
        print(f"demo-user-sampath: {demo_count} contacts")
        
        # Find a non-demo contact to see the user_id
        sample = await db.contacts.find_one({'user_id': {'$ne': 'demo-user-sampath'}})
        if sample:
            old_user_id = sample['user_id']
            old_count = await db.contacts.count_documents({'user_id': old_user_id})
            print(f"Found user_id '{old_user_id}' with {old_count} contacts")
            
            # Update all contacts with this user_id to use demo-user-sampath
            print(f"Updating {old_count} contacts from '{old_user_id}' to 'demo-user-sampath'...")
            
            result = await db.contacts.update_many(
                {'user_id': old_user_id},
                {'$set': {'user_id': 'demo-user-sampath'}}
            )
            
            print(f"Updated {result.modified_count} contacts")
            
            # Verify the update
            new_demo_count = await db.contacts.count_documents({'user_id': 'demo-user-sampath'})
            print(f"New demo-user-sampath count: {new_demo_count}")
            
        else:
            print("No non-demo contacts found")
        
        client.close()
        print("✅ User ID fix completed!")
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    asyncio.run(fix_user_ids())