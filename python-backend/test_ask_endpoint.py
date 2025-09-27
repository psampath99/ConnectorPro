#!/usr/bin/env python3
"""
Test script for the /ask endpoint functionality
This demonstrates the core logic without the Pydantic compatibility issues
"""

import asyncio
import json
import os
from datetime import datetime
from typing import List, Dict, Any

# Mock contact data for testing
MOCK_CONTACTS = [
    {
        "name": "John Smith",
        "title": "Software Engineer",
        "company": "Tech Corp",
        "email": "john.smith@techcorp.com",
        "phone": "+1-555-0123",
        "relationship_strength": "medium",
        "notes": "Met at tech conference",
        "tags": ["csv-import", "tech"]
    },
    {
        "name": "Sarah Johnson", 
        "title": "Product Manager",
        "company": "Innovation Inc",
        "email": "sarah.johnson@innovation.com",
        "phone": "+1-555-0456",
        "relationship_strength": "strong",
        "notes": "Former colleague",
        "tags": ["csv-import", "product"]
    },
    {
        "name": "Mike Chen",
        "title": "Data Scientist", 
        "company": "Analytics Pro",
        "email": "mike.chen@analyticspro.com",
        "phone": "+1-555-0789",
        "relationship_strength": "weak",
        "notes": "LinkedIn connection",
        "tags": ["csv-import", "data"]
    },
    {
        "name": "Emily Davis",
        "title": "UX Designer",
        "company": "Design Studio", 
        "email": "emily.davis@designstudio.com",
        "phone": "+1-555-0321",
        "relationship_strength": "medium",
        "notes": "Collaborated on project",
        "tags": ["csv-import", "design"]
    },
    {
        "name": "Alex Rodriguez",
        "title": "Marketing Director",
        "company": "Growth Co",
        "email": "alex.rodriguez@growthco.com", 
        "phone": "+1-555-0654",
        "relationship_strength": "strong",
        "notes": "Business partner",
        "tags": ["csv-import", "marketing"]
    }
]

async def test_ask_endpoint_logic(query: str, max_contacts: int = 50):
    """Test the core logic of the /ask endpoint"""
    
    print(f"🔍 Testing query: '{query}'")
    print(f"📊 Using {len(MOCK_CONTACTS)} mock contacts")
    
    # Simulate getting contacts from database
    contacts_data = []
    for contact in MOCK_CONTACTS[:max_contacts]:
        # Only include fields that have values (same logic as endpoint)
        contact_info = {k: v for k, v in contact.items() if v}
        contacts_data.append(contact_info)
    
    # Build the context for OpenAI (same as endpoint)
    contacts_context = f"Here is the user's contact database with {len(contacts_data)} contacts:\n\n"
    for i, contact in enumerate(contacts_data, 1):
        contacts_context += f"{i}. {contact}\n"
    
    # Create the prompt for OpenAI (same as endpoint)
    system_prompt = """You are an AI assistant that helps users analyze their professional network and contacts. 
You have access to their contact database and can answer questions about their connections, companies, relationships, and networking opportunities.

Be helpful, accurate, and provide specific insights based on the contact data provided. If you don't have enough information to answer a question, say so clearly.

When mentioning specific contacts, use their names. When discussing companies or roles, be specific about the data you're referencing."""

    user_prompt = f"""Based on my contact database, please answer this question: {query}

{contacts_context}

Please provide a helpful and specific answer based on the contact data above."""

    print("\n📝 Generated System Prompt:")
    print("=" * 50)
    print(system_prompt)
    
    print("\n📝 Generated User Prompt:")
    print("=" * 50)
    print(user_prompt[:500] + "..." if len(user_prompt) > 500 else user_prompt)
    
    # Check if OpenAI API key is available
    openai_api_key = os.getenv("OPENAI_API_KEY")
    if not openai_api_key:
        print("\n⚠️  OpenAI API key not found in environment variables")
        print("💡 Set OPENAI_API_KEY to test actual OpenAI integration")
        return {
            "success": False,
            "query": query,
            "answer": "OpenAI API key is not configured. Please set the OPENAI_API_KEY environment variable.",
            "contacts_used": len(contacts_data),
            "error_message": "OpenAI API key not found"
        }
    
    # Simulate OpenAI API call (would be actual call in real endpoint)
    try:
        import aiohttp
        
        headers = {
            "Authorization": f"Bearer {openai_api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": "gpt-4",
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            "temperature": 0.1,
            "max_tokens": 1000
        }
        
        print("\n🚀 Making OpenAI API call...")
        
        async with aiohttp.ClientSession() as session:
            async with session.post("https://api.openai.com/v1/chat/completions", headers=headers, json=payload) as response:
                if response.status != 200:
                    error_text = await response.text()
                    print(f"❌ OpenAI API error: {response.status} - {error_text}")
                    return {
                        "success": False,
                        "query": query,
                        "answer": f"Error calling OpenAI API: {response.status}",
                        "contacts_used": len(contacts_data),
                        "error_message": error_text
                    }
                
                result = await response.json()
                answer = result["choices"][0]["message"]["content"]
                
                print("\n✅ OpenAI API call successful!")
                return {
                    "success": True,
                    "query": query,
                    "answer": answer,
                    "contacts_used": len(contacts_data)
                }
                
    except Exception as e:
        print(f"❌ Error during OpenAI API call: {e}")
        return {
            "success": False,
            "query": query,
            "answer": f"An error occurred while processing your question: {str(e)}",
            "contacts_used": len(contacts_data),
            "error_message": str(e)
        }

async def main():
    """Test the ask endpoint with various queries"""
    
    print("🧪 Testing /ask Endpoint Logic")
    print("=" * 60)
    
    test_queries = [
        "How many contacts do I have?",
        "Who works at Tech Corp?", 
        "What companies are represented in my network?",
        "Who are my strongest connections?",
        "Tell me about my contacts in the tech industry"
    ]
    
    for i, query in enumerate(test_queries, 1):
        print(f"\n🔬 Test {i}/{len(test_queries)}")
        print("-" * 40)
        
        result = await test_ask_endpoint_logic(query)
        
        print(f"\n📋 Result:")
        print(f"Success: {result['success']}")
        print(f"Query: {result['query']}")
        print(f"Contacts Used: {result.get('contacts_used', 0)}")
        
        if result['success']:
            print(f"Answer: {result['answer']}")
        else:
            print(f"Error: {result.get('error_message', 'Unknown error')}")
        
        print("\n" + "=" * 60)

if __name__ == "__main__":
    asyncio.run(main())