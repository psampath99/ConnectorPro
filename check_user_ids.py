import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

async def check_user_ids():
    client = AsyncIOMotorClient(os.getenv('MONGODB_URI'), tlsAllowInvalidCertificates=True)
    db = client.connectorpro
    
    # Get distinct user_ids
    user_ids = await db.contacts.distinct('user_id')
    print(f"All user_ids in database: {user_ids}")
    
    # Count contacts for each user_id
    for user_id in user_ids:
        count = await db.contacts.count_documents({'user_id': user_id})
        print(f"User ID: {user_id} -> {count} contacts")
        
        # Get a sample contact for this user
        sample = await db.contacts.find_one({'user_id': user_id})
        if sample:
            print(f"  Sample contact: {sample.get('name', 'N/A')} at {sample.get('company', 'N/A')}")

asyncio.run(check_user_ids())