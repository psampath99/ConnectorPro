# 1) Executive Summary
- This document outlines the backend development plan for ConnectorPro, an AI-powered LinkedIn networking assistant.
- The plan adheres to the following constraints: FastAPI (Python 3.12), MongoDB Atlas with Motor, no Docker, and a frontend-driven manual testing strategy using a `main`-only Git workflow.
- The project will be developed over a series of sprints, dynamically adjusted to cover all frontend features, starting with LinkedIn data integration.

# 2) In-scope & Success Criteria
- **In-scope Features:**
  - LinkedIn network data import and analysis.
  - User authentication (signup, login, logout).
  - Contact management and relationship mapping.
  - AI-powered conversational assistant for networking guidance.
  - Personalized message drafting.
- **Success Criteria:**
  - All frontend features are fully supported by the backend API.
  - Each development sprint passes a manual testing phase conducted through the frontend UI.
  - Successful sprints are committed and pushed to the `main` branch on GitHub.

# 3) API Design
- **Conventions:**
  - **Base Path:** `/api/v1`
  - **Error Model:**
    ```json
    {
      "detail": "Error message describing the issue"
    }
    ```
- **Endpoints:**
  - **Authentication:**
    - `POST /api/v1/auth/signup`: Register a new user.
      - **Request:** `{ "email": "user@example.com", "password": "password123" }`
      - **Response:** `{ "access_token": "jwt_token", "token_type": "bearer" }`
    - `POST /api/v1/auth/login`: Authenticate a user.
      - **Request:** `{ "username": "user@example.com", "password": "password123" }`
      - **Response:** `{ "access_token": "jwt_token", "token_type": "bearer" }`
    - `POST /api/v1/auth/logout`: Log out a user (server-side token invalidation if needed).
    - `GET /api/v1/auth/me`: Get the current authenticated user's details.
      - **Response:** `{ "id": "...", "email": "..." }`
  - **Contacts:**
    - `POST /api/v1/contacts/import`: Import contacts from a LinkedIn data export.
      - **Request:** File upload (e.g., `multipart/form-data`).
      - **Response:** `{ "status": "success", "imported_count": 150 }`
    - `GET /api/v1/contacts`: Get a list of the user's contacts.
      - **Response:** `[{ "id": "...", "name": "...", "company": "...", "title": "...", "degree": 1 }]`
    - `GET /api/v1/contacts/{contact_id}`: Get details for a specific contact.
      - **Response:** `{ "id": "...", "name": "...", "company": "...", "title": "...", "degree": 1, "commonalities": [...] }`

# 4) Data Model (MongoDB Atlas)
- **Collections:**
  - **users:**
    - `_id`: ObjectId (Primary Key)
    - `email`: String, required, unique
    - `hashed_password`: String, required
    - `created_at`: DateTime, default: now
  - **contacts:**
    - `_id`: ObjectId (Primary Key)
    - `user_id`: ObjectId, required (reference to `users` collection)
    - `name`: String, required
    - `company`: String
    - `title`: String
    - `degree`: Number (1, 2, or 3)
    - `commonalities`: Array of embedded documents:
      - `type`: String (e.g., "employer", "education")
      - `description`: String
    - `created_at`: DateTime, default: now
    - **Example Document:**
      ```json
      {
        "_id": "60c72b2f9b1d8c001f8e4c8b",
        "user_id": "60c72b2f9b1d8c001f8e4c8a",
        "name": "Alex Kumar",
        "company": "Google",
        "title": "Software Engineer",
        "degree": 1,
        "commonalities": [
          { "type": "employer", "description": "Worked at Google" }
        ],
        "created_at": "2023-01-01T12:00:00Z"
      }
      ```

# 5) Frontend Audit & Feature Map
- **Routes/Components:**
  - `frontend/src/pages/Contacts.tsx`: Displays contact lists, filters, and bridge recommendations.
    - **Backend Capability:** `GET /api/v1/contacts`, `GET /api/v1/contacts/{contact_id}`.
  - `frontend/src/pages/Network.tsx`: Visualizes network statistics and connection paths.
    - **Backend Capability:** `GET /api/v1/contacts` (for aggregation).
  - `frontend/src/components/onboarding/OnboardingFlow.tsx`: (Assumed) Handles initial user setup, including LinkedIn data import.
    - **Backend Capability:** `POST /api/v1/contacts/import`.
- **Authentication:**
  - The application requires user signup and login, which will be handled by the auth endpoints. Protected routes will require a valid JWT.

# 6) Configuration & ENV Vars (core only)
- `APP_ENV`: `development`
- `PORT`: `8000`
- `MONGODB_URI`: (To be provided by the user)
- `JWT_SECRET`: A long, random, and secret string.
- `JWT_EXPIRES_IN`: `3600` (1 hour)
- `CORS_ORIGINS`: The frontend application's URL (e.g., `http://localhost:5137`).

# 9) Testing Strategy (Manual via Frontend)
- **Policy:** All backend features will be validated by interacting with the frontend UI. The browser's Network tab in DevTools will be used to inspect API requests and responses.
- **Per-sprint Manual Test Checklist (Frontend):** Each sprint will include a detailed list of UI steps to verify the implemented features.
- **User Test Prompt:** A concise set of instructions will be provided for a non-technical user to test the functionality.
- **Post-sprint:** If all tests pass, the code will be committed and pushed to the `main` branch on GitHub.

# 10) Dynamic Sprint Plan & Backlog (S0…Sn)
- **S0 - Environment Setup & Frontend Connection**
  - **Objectives:**
    - Create a basic FastAPI application with `/api/v1` and a `/healthz` endpoint.
    - Prompt the user for the `MONGODB_URI` and configure it.
    - Implement `/healthz` to perform a database connectivity check.
    - Enable CORS for the frontend origin.
    - Initialize a Git repository and push the initial setup to GitHub's `main` branch.
  - **Definition of Done:**
    - The backend server runs locally.
    - The `/healthz` endpoint returns a successful response, indicating DB connectivity.
    - The project is available on GitHub with `main` as the default branch.
  - **Manual Test Checklist (Frontend):**
    - Start the backend server.
    - Access the `/healthz` endpoint in a browser or with a tool like `curl` to confirm a successful response.
  - **User Test Prompt:**
    - "Please provide your MongoDB Atlas connection string. Once the backend is running, visit `http://localhost:8000/healthz` in your browser and confirm that you see a `{\"status\":\"ok\"}` message."
  - **Post-sprint:**
    - Commit the initial setup and push to `main`.

- **S1 - Basic Auth (signup, login, logout)**
  - **Objectives:**
    - Implement user signup, login, and logout functionality.
    - Secure at least one backend route to require authentication.
  - **Endpoints:**
    - `POST /api/v1/auth/signup`
    - `POST /api/v1/auth/login`
    - `POST /api/v1/auth/logout`
    - `GET /api/v1/auth/me`
  - **Tasks:**
    - Create a `users` collection in MongoDB to store user credentials.
    - Use Argon2 for password hashing.
    - Implement JWT-based authentication with short-lived access tokens.
  - **Definition of Done:**
    - A new user can sign up through the frontend.
    - The user can log in and receive a JWT.
    - The user can access a protected route with the JWT.
    - The user can log out.
  - **Manual Test Checklist (Frontend):**
    - Navigate to the signup page and create a new account.
    - Log in with the new credentials.
    - Access a protected page and verify that it loads.
    - Log out and attempt to access the protected page again, confirming it's blocked.
  - **User Test Prompt:**
    - "Please test the user authentication flow: sign up for a new account, log in, visit your profile page, and then log out."
  - **Post-sprint:**
    - Commit the authentication features and push to `main`.

- **S2 - LinkedIn Contact Import**
  - **Objectives:**
    - Implement the `POST /api/v1/contacts/import` endpoint.
    - Allow users to upload their LinkedIn data export (CSV or similar format).
    - Parse the uploaded file and populate the `contacts` collection in MongoDB.
  - **Tasks:**
    - Create the `contacts` data model.
    - Develop the file upload and parsing logic.
    - Associate imported contacts with the authenticated user.
  - **Definition of Done:**
    - A logged-in user can upload their LinkedIn data file.
    - The backend successfully parses the file and stores the contacts in the database.
    - The user's contacts are visible on the "Contacts" page in the frontend.
  - **Manual Test Checklist (Frontend):**
    - Log in to the application.
    - Navigate to the data import section (e.g., in Settings or Onboarding).
    - Upload a sample LinkedIn data file.
    - Go to the "Contacts" page and verify that the imported contacts are displayed correctly.
  - **User Test Prompt:**
    - "Please log in, go to the import page, and upload your LinkedIn data file. Then, check the 'Contacts' page to see if your network has been imported."
  - **Post-sprint:**
    - Commit the contact import feature and push to `main`.