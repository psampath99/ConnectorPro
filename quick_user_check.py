import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

async def quick_check():
    try:
        client = AsyncIOMotorClient(os.getenv('MONGODB_URI'), tlsAllowInvalidCertificates=True)
        db = client.connectorpro
        
        # Simple count by user_id
        demo_count = await db.contacts.count_documents({'user_id': 'demo-user-sampath'})
        print(f"demo-user-sampath: {demo_count} contacts")
        
        # Check for sampath.prema@gmail.com
        email_count = await db.contacts.count_documents({'user_id': 'sampath.prema@gmail.com'})
        print(f"sampath.prema@gmail.com: {email_count} contacts")
        
        # Get one sample contact that's not demo user
        sample = await db.contacts.find_one({'user_id': {'$ne': 'demo-user-sampath'}})
        if sample:
            print(f"Non-demo user_id found: {sample['user_id']}")
            count = await db.contacts.count_documents({'user_id': sample['user_id']})
            print(f"Contacts for {sample['user_id']}: {count}")
        
        client.close()
        
    except Exception as e:
        print(f"Error: {e}")

asyncio.run(quick_check())