import os
from dotenv import load_dotenv
import aiohttp
import asyncio
import ssl

load_dotenv()

async def test_openai():
    openai_api_key = os.getenv("OPENAI_API_KEY")
    if not openai_api_key:
        print("❌ No OpenAI API key found")
        return
    
    print(f"✅ OpenAI API key found: {openai_api_key[:10]}...")
    
    # Create SSL context
    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE
    
    connector = aiohttp.TCPConnector(ssl=ssl_context)
    
    headers = {
        "Authorization": f"Bearer {openai_api_key}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": "gpt-4o-mini",
        "messages": [
            {"role": "user", "content": "Say hello"}
        ],
        "max_tokens": 10
    }
    
    try:
        async with aiohttp.ClientSession(connector=connector, timeout=aiohttp.ClientTimeout(total=10)) as session:
            print("🔄 Testing OpenAI API...")
            async with session.post("https://api.openai.com/v1/chat/completions", headers=headers, json=payload) as response:
                if response.status == 200:
                    result = await response.json()
                    print(f"✅ OpenAI API working: {result['choices'][0]['message']['content']}")
                else:
                    error_text = await response.text()
                    print(f"❌ OpenAI API error: {response.status} - {error_text}")
    except Exception as e:
        print(f"❌ OpenAI API test failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_openai())