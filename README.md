# EduAI — Student AI Assistant Platform

## Project Description

EduAI is a web platform for students and administrators.  
It combines a classic chat interface with Retrieval-Augmented Generation (RAG), so responses can use uploaded university materials and parsed website content.

Core goals:
- Provide students with a simple AI chat experience
- Keep personal chat history and context
- Allow admins to manage data sources (files and websites)
- Keep RAG behavior controlled and auditable
- Support a multilingual interface (UK/EN)

---

## Technologies (General Overview)

| Area | Stack |
|---|---|
| Frontend | React, TypeScript, Vite, CSS |
| Backend | FastAPI, SQLAlchemy (async), Alembic |
| Database | PostgreSQL, pgvector |
| AI | OpenAI Chat Completions, Embeddings, Whisper |
| Auth | JWT Bearer Tokens |
| Deployment | Docker, Docker Compose, Nginx |

---

## Pages and Screenshot Plan

### 1) Landing Page
Capture:
- Navbar (logo, language switcher, auth actions)
- Hero section
- Feature cards
- Footer
![Landing](photos/01-landing.png)
![Landing 2](photos/01-landing2.png)
### 2) Login Page
Capture:
- Full login form
- Email/password inputs
- Submit button
- Link to registration
- One validation/error state (optional second screenshot)
![Login](photos/login.png)
### 3) Register Page
Capture:
- Full registration form
- All required fields
- Submit action
![Register](photos/registration.png)
### 4) Chat Page (Student)
Capture:
- Left sidebar with chat list
- Main chat area with messages
- Message input and voice button
- News panel on the right
![Chat Student](photos/chat.png)
### 5) Chat Page (Admin State)
Capture:
- Admin badge/role in sidebar
- Admin dashboard button in chat sidebar
![Chat Admin](photos/chat_admin.png)
### 6) Admin Page — Stats Tab
Capture:
- Stats cards
- Left admin navigation
![Admin Stats](photos/statistics.png)
### 7) Admin Page — Users Tab
Capture:
- Users table
- Role/status badges
- Action buttons (block/unblock/delete)
![Admin Users](photos/users.png)
### 8) Admin Page — Documents Tab
Capture:
- Upload button
- Documents list/table
- Delete action
![Admin Documents](photos/knowledge_base.png)
### 9) Admin Page — Websites Tab
Capture:
- Add website form
- Enabled/parse toggles
- Parse button
- Parse-all and clear-rag buttons
- Status and last parsed fields
![Admin Websites](photos/websites.png)
### 10) Admin Page — News Tab
Capture:
- Create news form
- Publish/draft controls
- List of news items
![Admin News](photos/news.png)
### 11) Swagger Page
Capture:
- `/docs` root view
- At least one auth endpoint and one websites endpoint expanded
![Swagger](photos/swagger.png)

### Screenshot Quality Checklist
- Use one browser and one theme consistently
- Keep zoom at `100%`
- Use the same window width for all captures
- Hide personal emails, tokens, local paths, and private docs
- Prefer full-page captures for main screens

---

## Technologies (Detailed Explanation)

### Frontend
- `React + TypeScript` for component structure and strict typing
- `Vite` for fast development and production builds
- Context providers for auth, theme, and language state
- Axios client with token interceptor and automatic 401 handling

### Backend
- `FastAPI` for typed async API endpoints
- `SQLAlchemy Async` for models and queries
- `Alembic` for schema migrations
- Routers split by domain: auth, chats, messages, documents, websites, admin, news

### AI and RAG
- OpenAI chat completion for response generation
- OpenAI embeddings for vector indexing
- Whisper for speech-to-text endpoint
- pgvector cosine similarity over `document_chunks`
- RAG context + chat history merged into prompt flow

### Database
- `PostgreSQL` as the primary relational store
- `pgvector` extension for embedding vectors
- Main entities: users, chats, messages, documents, document_chunks, website_sources, news

### Auth and Roles
- JWT bearer token auth
- Role-based access checks on admin endpoints
- Supported roles: `user`, `admin`

### Deployment and Runtime
- Dockerized frontend, backend, and database
- Nginx serves frontend and proxies `/api` to backend
- Docker Compose for local orchestration

---

## How to Run

### Option A: Docker Compose (Recommended)

```bash
docker compose up --build
```

URLs:
- Frontend: `http://localhost`
- Backend: `http://localhost:8000`
- Swagger: `http://localhost:8000/docs`

Notes:
- Ensure `backend/.env` contains a valid `OPENAI_API_KEY`
- Migrations run from backend container startup command

### Option B: Local Development

#### Backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

#### Frontend
```bash
cd frontend
npm install
npm run dev
```

Local frontend URL:
- `http://localhost:5173`

---

## Environment Variables (backend/.env)

```env
DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:5432/student_ai_db
SECRET_KEY=replace_with_long_random_string
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
OPENAI_API_KEY=sk-...
UPLOAD_DIR=uploads
MAX_FILE_SIZE_MB=20
FRONTEND_URL=http://localhost:5173
CORS_ORIGINS=
```

---

## First Admin Setup

Promote an existing user:

```sql
UPDATE users SET role = 'admin' WHERE email = 'admin@example.com';
```

After role update, log in again to refresh frontend role state.

"""
register() creates a user, hashes password, and returns jwt with user payload
login() validates credentials and returns jwt for authenticated requests
send_message() stores user message, runs rag + llm, and saves assistant reply
ingest_document() extracts text, chunks content, and stores embeddings
parse_website() fetches website text and indexes it into rag as a document
"""
