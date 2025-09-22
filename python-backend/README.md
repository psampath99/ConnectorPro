# ConnectorPro Python Backend

FastAPI-based backend for ConnectorPro - AI-powered LinkedIn networking assistant.

## Requirements

- Python 3.12+
- MongoDB Atlas connection

## Setup

1. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Create environment file:
```bash
cp .env.example .env
```

4. Update the `.env` file with your MongoDB Atlas connection string:
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/connectorpro?retryWrites=true&w=majority
```

## Running the Server

```bash
python main.py
```

The server will start on `http://localhost:8000`

## API Endpoints

- `GET /` - Root endpoint
- `GET /healthz` - Health check with database connectivity test
- `GET /api/v1` - API v1 root endpoint

## Health Check

Visit `http://localhost:8000/healthz` to verify the service is running and connected to MongoDB.

## API Documentation

FastAPI automatically generates interactive API documentation:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`