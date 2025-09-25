# Render Runtime Troubleshooting Guide

## 🎉 BUILD SUCCESS CONFIRMED!

Your build logs show:
```
==> Build successful 🎉
Successfully installed [all packages]
```

The **compilation issues are completely resolved**. The service failure is now a **runtime issue**.

## 🔍 Common Runtime Issues & Solutions

### 1. **Missing Environment Variables** (Most Common)

**Symptoms**: Service starts but crashes immediately

**Required Environment Variables**:
```bash
# CRITICAL - Service won't start without these:
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/connectorpro
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters

# IMPORTANT - For full functionality:
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=https://your-render-app.onrender.com/api/v1/gmail/callback
GOOGLE_CALENDAR_REDIRECT_URI=https://your-render-app.onrender.com/api/v1/calendar/callback
ENCRYPTION_KEY=your-base64-encoded-32-byte-key

# OPTIONAL - For CORS and additional features:
CORS_ORIGINS=https://your-frontend-domain.com
RAPIDAPI_KEY=your-rapidapi-key
```

**Fix**: Set these in Render Dashboard → Environment

### 2. **MongoDB Connection Issues**

**Symptoms**: "Database service not initialized" or connection timeouts

**Common Causes**:
- Invalid MongoDB URI format
- Network access restrictions in MongoDB Atlas
- Incorrect credentials

**Fix**:
1. **Check MongoDB Atlas**:
   - Go to Network Access → Add IP Address → Allow Access from Anywhere (`0.0.0.0/0`)
   - Verify Database User has read/write permissions
   
2. **Test Connection String**:
   ```bash
   # Format should be:
   mongodb+srv://username:password@cluster.mongodb.net/connectorpro?retryWrites=true&w=majority
   ```

### 3. **Port Configuration Issues**

**Symptoms**: Service starts but not accessible

**Fix**: Ensure your app listens on `0.0.0.0:8000`:
```python
# In main.py (already configured):
if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port)
```

### 4. **Startup Command Issues**

**Verify Render Settings**:
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `python main.py`

## 🔧 Debugging Steps

### Step 1: Check Render Logs
1. Go to Render Dashboard → Your Service → Logs
2. Look for specific error messages after "Build successful"

### Step 2: Common Error Messages

**"MONGODB_URI environment variable is not set"**
```
Fix: Add MONGODB_URI to environment variables
```

**"Failed to connect to MongoDB"**
```
Fix: Check MongoDB Atlas network access and credentials
```

**"Port already in use" or "Address already in use"**
```
Fix: Render handles this automatically, but restart the service
```

**"Module not found" errors**
```
Fix: Check if all dependencies are in requirements.txt
```

### Step 3: Test Health Endpoint

Once service is running, test:
```bash
curl https://your-render-app.onrender.com/healthz

# Expected response:
{
  "status": "ok",
  "database": "connected", 
  "message": "Service is healthy"
}
```

## 🚀 Quick Fix Checklist

1. **✅ Build successful** (Already done!)
2. **⚠️ Set MONGODB_URI** in Render environment variables
3. **⚠️ Set JWT_SECRET** (minimum 32 characters)
4. **⚠️ Configure MongoDB Atlas** network access (0.0.0.0/0)
5. **⚠️ Verify start command** is `python main.py`
6. **✅ Test health endpoint** once running

## 📊 Expected Success Indicators

When everything works:
- ✅ **Service Status**: "Live" in Render dashboard
- ✅ **Health Check**: `https://your-app.onrender.com/healthz` returns 200
- ✅ **API Docs**: `https://your-app.onrender.com/docs` loads
- ✅ **No error logs** in Render dashboard

## 🆘 If Still Failing

**Share the runtime logs** (after "Build successful") showing:
1. Service startup messages
2. Any error messages
3. Database connection attempts

The build issues are **completely resolved** - this is now just configuration!

---

**The compilation nightmare is over! 🎉 Now it's just standard deployment configuration.**