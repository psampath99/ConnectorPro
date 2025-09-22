# Final Setup Instructions

## 1. Update Database Password

You need to edit the `.env` file and replace `YOUR_PASSWORD_HERE` with your actual MongoDB database password.

1. Open `python-backend/.env`
2. Find the line: `MONGODB_URI=mongodb+srv://psampath_db_user:manicteapot144@cluster0.jatyovo.mongodb.net/connectorpro?retryWrites=true&w=majority&appName=Cluster0`
3. Replace `YOUR_PASSWORD_HERE` with the password you created for the `psampath_db_user` in MongoDB Atlas

## 2. Run the Backend

Once the pip installation completes and you've updated the password:

```bash
cd python-backend
source venv/bin/activate
python main.py
```

The server should start on `http://localhost:8000`

## 3. Test the Health Endpoint

Visit `http://localhost:8000/healthz` in your browser to verify:
- The server is running
- Database connection is working

You should see a response like:
```json
{
  "status": "ok",
  "database": "connected",
  "message": "Service is healthy"
}
```

## 4. API Documentation

Once running, you can view the interactive API docs at:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`