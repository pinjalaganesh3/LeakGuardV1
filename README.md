# 🛡️ LeakGuard — Privacy-First Leak Detection Dashboard

> **A smart security tool that finds and stops data leaks before they cause damage.**

![Python](https://img.shields.io/badge/Python-3.10+-blue?logo=python)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-teal?logo=fastapi)
![React](https://img.shields.io/badge/React-18-blue?logo=react)
![License](https://img.shields.io/badge/License-MIT-green)

---

## 🎯 What is LeakGuard?

**LeakGuard** is a privacy-first leak detection system. Think of it as a **security guard for your data** — it watches logs from your web servers, AI chatbots, and databases, looking for sensitive information that shouldn't be there.

### Explained Simply (for 1st-Year B.Tech Students)

Imagine you run a website. Users share their personal information — names, emails, credit card numbers. Sometimes, this data accidentally appears in:

- **Web server logs** (like Apache or Nginx access logs)
- **AI chatbot responses** (an LLM accidentally revealing API keys)
- **Database exports** (someone dumped a table with Social Security Numbers)

**LeakGuard catches these leaks in two ways:**

1. **🔍 Pattern Matching (Regex DLP):** Like a word search puzzle — it looks for specific patterns like `XXX-XX-XXXX` (Social Security Numbers) or `4111-XXXX-XXXX-XXXX` (Visa credit cards)

2. **🧠 AI-Powered Detection (Semantic Similarity):** Uses a small AI model running on your computer to *understand the meaning* of text. Even if someone writes "the admin password for the production database is...", LeakGuard understands that's sensitive, even without exact pattern matches.

### How Semantic Similarity Works (ELI5)

```
Your Text: "Here are the database credentials for production"
                    ↓
            [AI Model converts to numbers]
                    ↓
        Text Vector: [0.12, -0.34, 0.56, ...]
                    ↓
            [Compare with known sensitive phrases]
                    ↓
        "database connection string" → 0.87 similarity ✅ ALERT!
        "weather forecast"           → 0.11 similarity ❌ Safe
```

The AI converts text into lists of numbers (called **embeddings**). Similar meanings produce similar numbers. We compare using **cosine similarity** — like measuring the angle between two arrows. If they point in a similar direction (similarity > 0.6), it's a match!

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│                    FRONTEND                          │
│          React + Vite + Tailwind CSS                │
│  ┌──────────┬──────────┬──────────┬──────────┐      │
│  │Dashboard │ Alerts   │ Ingest   │ Rules    │      │
│  │ (Charts) │ (List)   │ (Form)   │ (Config) │      │
│  └──────────┴──────────┴──────────┴──────────┘      │
│                      ↕ HTTP API                      │
├─────────────────────────────────────────────────────┤
│                    BACKEND                           │
│               FastAPI + Python                       │
│  ┌──────────────────────────────────────────┐       │
│  │  Detection Engine                         │       │
│  │  ┌───────────────┐ ┌──────────────────┐  │       │
│  │  │  Regex DLP    │ │ Semantic (AI)    │  │       │
│  │  │  12 patterns  │ │ MiniLM model     │  │       │
│  │  └───────────────┘ └──────────────────┘  │       │
│  └──────────────────────────────────────────┘       │
│                      ↕                               │
│              SQLite Database                         │
│  [logs] [alerts] [rules] [audit] [consent]          │
└─────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start (Run in 5 Minutes)

### Prerequisites

- **Python 3.10+** ([download](https://python.org))
- **Node.js 18+** ([download](https://nodejs.org))
- **Git** ([download](https://git-scm.com))

### Step 1: Clone & Install Backend

```bash
# Clone the repository
cd LeakGuardV3

# Create a virtual environment (recommended)
python -m venv venv

# Activate it:
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt
```

### Step 2: Configure (Optional)

```bash
# Copy the example config
copy .env.example .env    # Windows
# cp .env.example .env    # Mac/Linux

# Edit .env to configure SMTP/webhook (or leave defaults for console logging)
```

### Step 3: Start the Backend

```bash
# From the project root
uvicorn backend.main:app --reload --port 8000
```

You should see:
```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Application startup complete.
```

Visit **http://localhost:8000/docs** for the interactive API documentation.

### Step 4: Start the Frontend

```bash
# In a new terminal
cd frontend
npm install
npm run dev
```

Visit **http://localhost:5173** to see the dashboard!

### Start Both Development Servers

On Windows, from the project root, run:

```powershell
.\start-dev.ps1
```

This opens the FastAPI backend on `http://127.0.0.1:8000` and the Vite frontend on `http://127.0.0.1:5173`.

The frontend uses Vite's `/api` development proxy by default, which avoids browser CORS requests during local development. The backend also allows the common React development origins (`localhost:3000` and `localhost:5173`) through FastAPI's built-in CORS middleware. To use a direct backend URL instead, copy `frontend/.env.example` to `frontend/.env` and set `VITE_API_BASE_URL`.

This repository uses FastAPI, not Django, so `django-cors-headers` is not applicable; adding Django to the backend would be an unrelated framework migration.

### Production Deployment

For a multi-user deployment, use the included Docker Compose stack. It runs PostgreSQL for durable shared storage, FastAPI for the API, and Nginx for the frontend plus `/api` reverse proxy.

```bash
copy .env.example .env
```

Set strong values in `.env`:

```env
POSTGRES_PASSWORD=use-a-long-random-password
PUBLIC_ORIGIN=https://your-domain.example
ENABLE_SEMANTIC=false
```

Then start the product:

```bash
docker compose up -d --build
```

Put HTTPS in front of port 80 using your hosting provider or a reverse proxy. Keep `COOKIE_SECURE=true` in production. Never expose PostgreSQL directly to the internet.

Create backups regularly:

```powershell
.\backup.ps1
```

The backup must be copied to separate storage. A database on one server is persistent, but it is not a backup if that server fails.

The first registered account becomes the company administrator. Later accounts are analysts by default. Users see only their own scans, alerts, dashboard, audit records, and consent records. Admins can manage team roles and detection rules.

### Step 5: Run Tests

```bash
# From the project root
pip install pytest
pytest tests/ -v
```

---

## 📡 API Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/ingest` | POST | Ingest a log for scanning |
| `/api/alerts` | GET | List alerts (with filters) |
| `/api/alerts/{id}` | GET | Get alert details |
| `/api/alerts/{id}/acknowledge` | POST | Acknowledge an alert |
| `/api/alerts/{id}/action` | POST | Take action (notify/throttle/block) |
| `/api/alerts/{id}/rollback` | POST | Rollback an action |
| `/api/rules` | GET/POST | List or create detection rules |
| `/api/rules/{id}` | PUT/DELETE | Update or delete a rule |
| `/api/rules/{id}/toggle` | POST | Enable/disable a rule |
| `/api/audit` | GET | View the audit trail |
| `/api/consent` | GET/POST | Manage consent records |
| `/api/dashboard/stats` | GET | Dashboard statistics |

### Example: Ingest a Log

```bash
curl -X POST http://localhost:8000/api/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "source_type": "web",
    "content": "User accessed /profile?ssn=123-45-6789&email=john@example.com"
  }'
```

**Response:**
```json
{
  "log_id": 1,
  "alerts_created": 2,
  "findings": [
    {
      "rule_name": "Social Security Number (SSN)",
      "match_type": "regex",
      "severity": "critical",
      "confidence": 1.0,
      "redacted_evidence": "***-**-6789"
    },
    {
      "rule_name": "Email Address",
      "match_type": "regex",
      "severity": "medium",
      "confidence": 1.0,
      "redacted_evidence": "j***@example.com"
    }
  ]
}
```

---

## 🔒 Built-in Detection Rules

### Regex Rules (12 patterns)

| Rule | Severity | Example Match |
|------|----------|---------------|
| Social Security Number | 🔴 Critical | `123-45-6789` |
| Credit Card (Visa) | 🔴 Critical | `4111-1111-1111-1111` |
| Credit Card (Mastercard) | 🔴 Critical | `5500-0000-0000-0004` |
| AWS Access Key | 🔴 Critical | `AKIAIOSFODNN7EXAMPLE` |
| GitHub Token | 🔴 Critical | `ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` |
| Stripe Key | 🔴 Critical | `<stripe-live-key-placeholder>` |
| Private Key Header | 🔴 Critical | `-----BEGIN RSA PRIVATE KEY-----` |
| JWT Token | 🟠 High | `eyJhbGciOiJIUzI1NiJ9.eyJ...` |
| Generic API Key | 🟠 High | `api_key = "abc123def456..."` |
| Email Address | 🟡 Medium | `user@example.com` |
| Phone Number (US) | 🟢 Low | `(555) 123-4567` |
| IPv4 Address | 🟢 Low | `192.168.1.1` |

### Semantic Rules (6 categories)

| Category | What it Detects |
|----------|----------------|
| SSN | Text discussing Social Security Numbers |
| Credit Card | Text discussing credit card information |
| Passwords | Text revealing password credentials |
| API Secrets | Text exposing API keys or tokens |
| DB Connection | Text with database connection details |
| Health Info | Text with personal health information (HIPAA) |

---

## 🧪 Tests

Three synthetic tests verify core functionality:

1. **`test_regex_dlp_detection`** — Sends a log with SSN, credit card, and email → verifies all three are detected and properly redacted
2. **`test_semantic_detection`** — Sends natural-language text about database credentials → verifies the AI engine flags it
3. **`test_alert_lifecycle`** — Full workflow: ingest → create alert → acknowledge → block → rollback → verify audit trail

---

## 📂 Project Structure

```
LeakGuardV3/
├── backend/
│   ├── __init__.py
│   ├── main.py              # FastAPI app entry point
│   ├── config.py             # Environment settings
│   ├── database.py           # SQLite + SQLAlchemy setup
│   ├── models.py             # Database table definitions
│   ├── schemas.py            # API request/response types
│   ├── detection.py          # 🔍 The detection engine (regex + AI)
│   ├── redactor.py           # Masks sensitive data in evidence
│   ├── notifier.py           # Email + webhook notifications
│   ├── seed_rules.py         # Pre-loads default detection rules
│   └── routers/
│       ├── ingest.py         # POST /api/ingest
│       ├── alerts.py         # Alerts CRUD + actions
│       ├── rules.py          # Rules management
│       ├── audit.py          # Audit log viewer
│       ├── consent.py        # Consent recording
│       └── dashboard.py      # Dashboard statistics
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── App.jsx           # Root app with routing
│       ├── main.jsx          # React entry point
│       ├── index.css         # Dark theme + glassmorphism styles
│       ├── components/
│       │   ├── Sidebar.jsx   # Navigation sidebar
│       │   ├── StatCard.jsx  # Dashboard stat cards
│       │   ├── AlertCard.jsx # Alert display component
│       │   └── SeverityBadge.jsx
│       └── pages/
│           ├── Dashboard.jsx # 📊 Stats + charts
│           ├── Alerts.jsx    # 🚨 Alert list + actions
│           ├── Ingest.jsx    # 📥 Log ingestion form
│           ├── Rules.jsx     # ⚙️ Rules configuration
│           ├── AuditLog.jsx  # 📋 Audit trail
│           └── Consent.jsx   # ✅ Consent management
├── tests/
│   └── test_detection.py     # 3 synthetic tests
├── requirements.txt
├── .env.example
└── README.md                 # You are here!
```

---

## 🔑 Key Concepts Glossary

| Term | Meaning |
|------|---------|
| **DLP** | Data Loss Prevention — technology to detect and prevent data leaks |
| **PII** | Personally Identifiable Information — data that can identify a person (SSN, email, etc.) |
| **Regex** | Regular Expression — a pattern-matching language for finding text patterns |
| **Embedding** | Converting text to a list of numbers that capture its meaning |
| **Cosine Similarity** | A math formula measuring how similar two vectors are (0 = different, 1 = identical) |
| **Redaction** | Masking sensitive data: `123-45-6789` → `***-**-6789` |
| **SMTP** | Simple Mail Transfer Protocol — how emails are sent |
| **Webhook** | An HTTP callback — when something happens, send a POST request to a URL |
| **FastAPI** | A modern Python web framework for building APIs |
| **SQLite** | A lightweight database stored as a single file |
| **JWT** | JSON Web Token — a compact way to transmit authentication data |

---

## 📜 License

MIT License — use freely for learning and projects.

---

*Built with ❤️ as a learning tool for understanding Data Loss Prevention, API design, and full-stack development.*
