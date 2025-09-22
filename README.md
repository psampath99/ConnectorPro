# ConnectorPro

AI-powered LinkedIn networking assistant that helps busy professionals identify the right people to connect with, leverage their existing network for warm introductions, and personalize outreach at scale.

## 🚀 Features

- **LinkedIn Network Analysis & Bridge Mapping** - Visualize connections and find introduction paths
- **AI-Powered Conversational Assistant** - Get strategic networking guidance
- **Personalized Message Drafting** - Generate authentic outreach messages
- **Gmail Integration** - Send introduction requests via email
- **Google Calendar Integration** - Schedule meetings with Google Meet links
- **Follow-up Management** - Never miss important follow-ups

## 🏗️ Architecture

```
Frontend (React/Vite) ←→ Python Backend (FastAPI) ←→ MongoDB Atlas
    Port 5138                Port 8000                  (Cloud)
```

## 📋 Current Status

**Sprint S0**: ✅ Complete - Environment Setup & Frontend Connection
- Python FastAPI backend with MongoDB Atlas integration
- Health check system and API documentation
- CORS configuration for frontend communication
- Complete development environment setup

**Sprint S1**: 🔄 Next - Basic Authentication (signup, login, logout)

## 🛠️ Quick Start

### Prerequisites
- Python 3.12+
- Node.js 18+
- MongoDB Atlas account

### Backend Setup
```bash
cd python-backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Add your MongoDB connection string to .env
python main.py
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### Testing
- Backend Health: `http://localhost:8000/healthz`
- API Documentation: `http://localhost:8000/docs`
- Frontend App: `http://localhost:5138`

## 📚 Documentation

- [Backend Development Plan](Backend-dev-plan.md)
- [Sprint S0 Release Notes](docs/ConnectorPro_Release_Notes.md)
- [Setup Instructions](python-backend/SETUP_INSTRUCTIONS.md)

## 🎯 Target Users

- Job seekers exploring new roles
- Solo consultants generating referrals
- Community managers handling events
- Sales representatives seeking warm introductions
- Executive assistants managing networking

## 🔒 Security

- Environment variables for sensitive data
- JWT-based authentication (Sprint S1)
- Secure MongoDB Atlas connection
- CORS protection

## 📈 Roadmap

- **Sprint S1**: User authentication and JWT tokens
- **Sprint S2**: LinkedIn data import and contact management
- **Sprint S3**: AI-powered message generation
- **Sprint S4**: Gmail and Google Calendar integrations

## 🤝 Contributing

This project follows a sprint-based development approach. See the [Backend Development Plan](Backend-dev-plan.md) for detailed implementation guidelines.

## 📄 License

Private project - All rights reserved.

---

*ConnectorPro - Making professional networking intelligent and efficient.*