"""
Temporary script to fix user IDs by adding an endpoint to the running application
"""
import requests
import json

def add_fix_endpoint():
    """Add a temporary endpoint to fix user IDs"""
    
    # This would be the endpoint code to add to main.py
    endpoint_code = '''
@app.post("/api/v1/admin/fix-user-ids")
async def fix_user_ids():
    """Fix user IDs - move all non-demo contacts to demo user"""
    try:
        if not db_service:
            raise HTTPException(status_code=503, detail="Database not available")
        
        # Count current demo contacts
        demo_count = await db_service.contacts_collection.count_documents({'user_id': 'demo-user-sampath'})
        logger.info(f"Current demo contacts: {demo_count}")
        
        # Find a non-demo contact
        sample = await db_service.contacts_collection.find_one({'user_id': {'$ne': 'demo-user-sampath'}})
        if sample:
            old_user_id = sample['user_id']
            old_count = await db_service.contacts_collection.count_documents({'user_id': old_user_id})
            logger.info(f"Found {old_count} contacts with user_id: {old_user_id}")
            
            # Update all contacts with this user_id to demo-user-sampath
            result = await db_service.contacts_collection.update_many(
                {'user_id': old_user_id},
                {'$set': {'user_id': 'demo-user-sampath'}}
            )
            
            new_demo_count = await db_service.contacts_collection.count_documents({'user_id': 'demo-user-sampath'})
            
            return {
                "success": True,
                "message": f"Updated {result.modified_count} contacts",
                "old_user_id": old_user_id,
                "old_count": old_count,
                "new_demo_count": new_demo_count
            }
        else:
            return {
                "success": True,
                "message": "No non-demo contacts found",
                "demo_count": demo_count
            }
            
    except Exception as e:
        logger.error(f"Fix user IDs error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
'''
    
    print("Add this endpoint to main.py and then call:")
    print("curl -X POST http://localhost:8000/api/v1/admin/fix-user-ids")
    print("\nEndpoint code:")
    print(endpoint_code)

if __name__ == "__main__":
    add_fix_endpoint()