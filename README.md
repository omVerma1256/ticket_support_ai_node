# 🎫 Ticket Support — Node.js Backend API

> A production-ready REST + SSE streaming API for the AI Ticket Support system. Built with **Node.js**, **Express**, **PostgreSQL**, **Knex**, and **OpenAI GPT-4o** — powering real-time AI ticket classification and streaming chat responses.

---

## ⚡ Quick Start

> Complete steps to get the backend API running from scratch.

### Prerequisites — install these first
| Tool | Version | Link |
|---|---|---|
| **Node.js** | ≥ 18.x | [nodejs.org](https://nodejs.org) |
| **npm** | ≥ 9.x | Comes with Node |
| **PostgreSQL** | ≥ 14 | [postgresql.org](https://www.postgresql.org/download/) |
| **OpenAI API Key** | — | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) |

---

### Step 1 — Clone & Install

```bash
cd "Ticket Support - Node"
npm install
```

---

### Step 2 — Create PostgreSQL Database

Open **psql** or any PostgreSQL client (pgAdmin, DBeaver, TablePlus) and run:

```sql
CREATE DATABASE supportTicketAi;
```

> If you already have a database, just note its name — you'll use it in Step 3.

---

### Step 3 — Configure Environment

```bash
cp .env.example .env
```

Open `.env` and fill in **every** value:

```env
# Server
PORT=3001
NODE_ENV=development

# PostgreSQL — your database credentials
DB_HOST=localhost
DB_PORT=5432
DB_NAME=supportTicketAi        ← name of the DB you created above
DB_USER=postgres              ← your postgres username
DB_PASSWORD=your_password     ← your postgres password

# OpenAI — required for AI classification and responses
OPENAI_API_KEY=sk-...your-key-here...

# CORS — * allows all origins (fine for development)
CORS_ORIGIN=*
```

> ⚠️ `OPENAI_API_KEY` is required. The server will start without it but ticket creation and AI chat will not work.

---

### Step 4 — Run Database Migrations

This creates the `tickets` and `messages` tables with all indexes:

```bash
npm run migrate
```

Expected output:
```
Using environment: development
Batch 1 run: 2 migrations
```

> To undo migrations: `npm run migrate:rollback`

---

### Step 5 — Start the Server

**Development** (Nodemon — auto-restarts when you change any file):

```bash
npm run dev
```

**Production** (no auto-restart):

```bash
npm start
```

Expected terminal output on success:
```
🔌 Connecting to PostgreSQL...
   Host     : localhost
   Port     : 5432
   Database : supportTicketAi
   User     : postgres

✅ PostgreSQL connected  →  PostgreSQL 16.x

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  🚀  Server is running
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  HTTP      →  http://localhost:3001
  Health    →  http://localhost:3001/health
  DB Check  →  http://localhost:3001/health/db
  Tickets   →  http://localhost:3001/api/tickets
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Env       →  development
  CORS      →  *
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

### Step 6 — Verify It's Working

Open your browser or Postman and hit these URLs:

| URL | Expected |
|---|---|
| `http://localhost:3001/health` | `{ "status": "ok" }` |
| `http://localhost:3001/health/db` | DB version + table counts |
| `http://localhost:3001/api/tickets` | `{ "tickets": [] }` |

---

### Common Errors

| Error | Cause | Fix |
|---|---|---|
| `ECONNREFUSED 127.0.0.1:5432` | PostgreSQL not running | Start PostgreSQL service |
| `database "supportTicketAi" does not exist` | DB not created | Run `CREATE DATABASE supportTicketAi;` in psql |
| `password authentication failed` | Wrong credentials | Check `DB_USER` / `DB_PASSWORD` in `.env` |
| `relation "tickets" does not exist` | Migrations not run | Run `npm run migrate` |
| AI response fails | Missing OpenAI key | Set `OPENAI_API_KEY` in `.env` |

---

## 📋 Table of Contents

- [Tech Stack](#-tech-stack)
- [Features](#-features)
- [Prerequisites](#-prerequisites)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
  - [1. Install Dependencies](#1-install-dependencies)
  - [2. Configure Environment](#2-configure-environment)
  - [3. Create the Database](#3-create-the-database)
  - [4. Run Migrations](#4-run-migrations)
  - [5. Start the Server](#5-start-the-server)
- [Environment Variables](#-environment-variables)
- [Database Schema](#-database-schema)
  - [tickets table](#tickets-table)
  - [messages table](#messages-table)
  - [Indexes](#indexes)
- [API Reference](#-api-reference)
  - [Health Check](#health-check)
  - [Create Ticket](#post-apitickets)
  - [List Tickets](#get-apitickets)
  - [Get Ticket](#get-apiticketsid)
  - [Add Message](#post-apiticketsidmessages)
  - [Stream AI Response](#get-apiticketsidchat-stream)
  - [Resolve Ticket](#put-apiticketsidresolve)
  - [Close Ticket](#put-apiticketsidclose)
- [OpenAI Integration](#-openai-integration)
- [Scripts Reference](#-scripts-reference)
- [CORS Configuration](#-cors-configuration)

---

## 🛠 Tech Stack

| Technology | Version | Purpose |
|---|---|---|
| **Node.js** | ≥ 18.x | Runtime |
| **Express.js** | ^4.19 | HTTP framework |
| **PostgreSQL** | ≥ 14 | Relational database |
| **Knex.js** | ^3.1 | SQL query builder + migrations |
| **OpenAI SDK** | ^4.52 | GPT-4o classify + streaming |
| **Joi** | ^17.13 | Request validation |
| **Helmet** | ^7.1 | HTTP security headers |
| **Morgan** | ^1.10 | HTTP request logging |
| **CORS** | ^2.8 | Cross-origin resource sharing |
| **UUID** | ^10 | Unique message IDs |
| **Nodemon** | ^3.1 | Auto-restart in development |
| **dotenv** | ^16.4 | Environment variable loading |

---

## ✨ Features

- 🤖 **AI Ticket Classification** — GPT-4o-mini with structured JSON output classifies every ticket into `Technical`, `Billing`, `Account`, or `General`
- 💬 **Streaming AI Responses** — SSE (Server-Sent Events) streams AI reply text word-by-word to the frontend in real time
- 🗃️ **PostgreSQL Persistence** — All tickets and messages are stored in PostgreSQL with indexed queries for performance
- 🔒 **Joi Validation** — Every endpoint validates request bodies with detailed, user-friendly error messages
- 🌐 **Flexible CORS** — Wildcard (`*`) or origin-specific allow-listing from environment config
- 🔄 **Knex Migrations** — Database schema managed via versioned migration files
- ⚡ **Transaction Safety** — Ticket creation and message saving use DB transactions for atomicity
- 🪵 **Structured Logging** — Morgan HTTP logs with health-check suppression
- 🛡️ **Security Headers** — Helmet sets all recommended HTTP security headers
- 🔁 **Graceful Shutdown** — SIGTERM/SIGINT handled cleanly — closes DB pool before exit

---

## 📦 Prerequisites

Before you begin, make sure you have the following installed:

- **Node.js** ≥ 18.x → [nodejs.org](https://nodejs.org)
- **npm** ≥ 9.x (comes with Node)
- **PostgreSQL** ≥ 14 → [postgresql.org](https://www.postgresql.org/download/)
- **An OpenAI API Key** → [platform.openai.com/api-keys](https://platform.openai.com/api-keys)

---

## 📁 Project Structure

```
Ticket Support - Node/
│
├── .env                        # Your actual environment variables (git-ignored)
├── .env.example                # Template — copy to .env and fill in
├── .gitignore
├── knexfile.js                 # Knex environments (development / production)
├── package.json
│
├── migrations/                 # Versioned database schema migrations
│   ├── 001_create_tickets.js   # Creates the `tickets` table + indexes
│   └── 002_create_messages.js  # Creates the `messages` table + FK + indexes
│
└── src/
    ├── app.js                  # Express app setup (middleware, routes, CORS)
    ├── server.js               # Entry point — starts HTTP server + DB check
    │
    ├── db/
    │   ├── knex.js             # Knex singleton (database connection)
    │   └── bookshelf.js        # (stub — Knex used directly)
    │
    ├── services/
    │   ├── aiService.js        # OpenAI integration (classify, respond, stream)
    │   └── ticketService.js    # All DB operations for tickets + messages
    │
    ├── controllers/
    │   └── ticketController.js # Route handler functions (REST + SSE)
    │
    ├── routes/
    │   └── tickets.js          # Express Router — maps URLs to controllers
    │
    ├── validators/
    │   └── ticketValidators.js # Joi schemas + middleware factories
    │
    └── middleware/
        └── errorHandler.js     # Centralized error handler + createError helper
```

---

## 🚀 Getting Started

### 1. Install Dependencies

```bash
cd "Ticket Support - Node"
npm install
```

### 2. Configure Environment

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

Open `.env` and set:

```env
PORT=3001
NODE_ENV=development

DB_HOST=localhost
DB_PORT=5432
DB_NAME=your_database_name
DB_USER=your_postgres_user
DB_PASSWORD=your_postgres_password

OPENAI_API_KEY=sk-...your-key-here...

CORS_ORIGIN=*
```

> ⚠️ **The `OPENAI_API_KEY` is required** — the server will start but ticket creation and AI chat will fail without it.

### 3. Create the Database

Connect to your PostgreSQL instance and create the database:

```sql
-- In psql or any PostgreSQL client:
CREATE DATABASE supportTicketAi;
```

> If your database is named differently, update `DB_NAME` in `.env` to match.

### 4. Run Migrations

This creates the `tickets` and `messages` tables with all indexes:

```bash
npm run migrate
```

Expected output:
```
Using environment: development
Batch 1 run: 2 migrations
```

To roll back all migrations:

```bash
npm run migrate:rollback
```

### 5. Start the Server

**Development** (with Nodemon auto-restart on file changes):

```bash
npm run dev
```

Expected output:
```
🔌 Connecting to PostgreSQL...
   Host     : localhost
   Port     : 5432
   Database : supportTicketAi
   User     : postgres

✅ PostgreSQL connected  →  PostgreSQL 16.x

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  🚀  Server is running
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  HTTP      →  http://localhost:3001
  Health    →  http://localhost:3001/health
  DB Check  →  http://localhost:3001/health/db
  Tickets   →  http://localhost:3001/api/tickets
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Env       →  development
  CORS      →  *
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

If the DB connection **fails**, the server prints a helpful hint and exits:
```
❌ Failed to start server:
   connect ECONNREFUSED 127.0.0.1:5432
   → Is PostgreSQL running? Check DB_HOST and DB_PORT in .env
```

**Production**:

```bash
npm start
```

---

## ⚙️ Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | No | `3001` | Port the server listens on |
| `NODE_ENV` | No | `development` | Environment (`development` / `production`) |
| `DB_HOST` | Yes | `localhost` | PostgreSQL host |
| `DB_PORT` | No | `5432` | PostgreSQL port |
| `DB_NAME` | Yes | — | PostgreSQL database name |
| `DB_USER` | Yes | — | PostgreSQL username |
| `DB_PASSWORD` | Yes | — | PostgreSQL password |
| `OPENAI_API_KEY` | Yes | — | OpenAI API key (starts with `sk-`) |
| `CORS_ORIGIN` | No | `*` | Allowed origins (`*` = all, or comma-separated URLs) |

---

## 🗄️ Database Schema

### `tickets` table

```sql
CREATE TABLE tickets (
  id            VARCHAR(20)   PRIMARY KEY,     -- e.g. TKT-AB12CD34
  customer_name VARCHAR(100)  NOT NULL,
  email         VARCHAR(150)  NOT NULL,
  subject       VARCHAR(300)  NOT NULL,
  question      TEXT          NOT NULL,
  category      VARCHAR(20)   NOT NULL         -- Technical | Billing | Account | General
                CHECK (category IN ('Technical','Billing','Account','General')),
  status        VARCHAR(30)   NOT NULL         -- Open | AI Responded | Waiting For User | Resolved | Closed
                CHECK (status IN ('Open','AI Responded','Waiting For User','Resolved','Closed')),
  created_at    TIMESTAMP     DEFAULT NOW(),
  updated_at    TIMESTAMP     DEFAULT NOW()
);
```

### `messages` table

```sql
CREATE TABLE messages (
  id         UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id  VARCHAR(20)   NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  sender     VARCHAR(10)   NOT NULL CHECK (sender IN ('User','AI')),
  message    TEXT          NOT NULL,
  created_at TIMESTAMP     DEFAULT NOW()
);
```

### Indexes

| Table | Index Name | Columns | Purpose |
|---|---|---|---|
| `tickets` | `idx_tickets_email` | `email` | Look up tickets by customer email |
| `tickets` | `idx_tickets_status` | `status` | Filter by status |
| `tickets` | `idx_tickets_category` | `category` | Filter by category |
| `tickets` | `idx_tickets_created_at` | `created_at` | Sort by newest |
| `tickets` | `idx_tickets_status_category` | `status, category` | Combined filter |
| `messages` | `idx_messages_ticket_id` | `ticket_id` | Load thread for a ticket |
| `messages` | `idx_messages_created_at` | `created_at` | Sort messages chronologically |
| `messages` | `idx_messages_ticket_created` | `ticket_id, created_at` | Optimised thread load |

---

## 📡 API Reference

All endpoints are prefixed with `/api`. Responses are JSON unless noted.

---

### Health Check

```
GET /health
```

**Response `200`:**
```json
{
  "status": "ok",
  "timestamp": "2026-06-10T12:00:00.000Z",
  "service": "ticket-support-api",
  "environment": "development"
}
```

---

### `GET /health/db`

Live database connection diagnostic — checks connectivity, returns PostgreSQL version, connection pool stats, and row counts for every table.

```
GET /health/db
```

**Response `200` (healthy):**
```json
{
  "status": "ok",
  "latency": "8ms",
  "database": {
    "host": "localhost",
    "port": "5432",
    "name": "supportTicketAi",
    "user": "postgres",
    "version": "PostgreSQL 16.3 on x86_64-pc-linux-gnu...",
    "pool": {
      "min": 2,
      "max": 10,
      "active": 1,
      "idle": 1,
      "pending": 0
    }
  },
  "tables": {
    "tickets": 42,
    "messages": 158
  },
  "timestamp": "2026-06-10T12:00:00.000Z"
}
```

**Response `503` (DB down):**
```json
{
  "status": "error",
  "latency": "3001ms",
  "error": "connect ECONNREFUSED 127.0.0.1:5432",
  "code": "ECONNREFUSED",
  "timestamp": "2026-06-10T12:00:00.000Z"
}
```

> 💡 **Tip:** Use `GET /health/db` to verify your database is live before debugging API issues. Also useful in deployment pipelines and uptime monitors.

---

### `POST /api/tickets`

Create a new support ticket. The server automatically:
1. Classifies the ticket into a category using **OpenAI GPT-4o-mini structured output**
2. Generates an initial AI response using **GPT-4o**
3. Saves the ticket + both messages in a **single DB transaction**

**Request Body:**
```json
{
  "customerName": "Jane Smith",
  "email": "jane@example.com",
  "subject": "Cannot access my account",
  "question": "I am unable to log in since this morning. I get a 403 error."
}
```

**Validation Rules:**
- `customerName` — required, 2–100 chars
- `email` — required, valid email format, max 150 chars
- `subject` — required, 3–300 chars
- `question` — required, 10–5000 chars

**Response `201`:**
```json
{
  "ticket": {
    "id": "TKT-AB12CD34",
    "customerName": "Jane Smith",
    "email": "jane@example.com",
    "subject": "Cannot access my account",
    "question": "I am unable to log in...",
    "category": "Technical",
    "status": "AI Responded",
    "createdAt": "2026-06-10T12:00:00.000Z",
    "updatedAt": "2026-06-10T12:00:00.000Z",
    "messages": [
      { "id": "uuid", "sender": "User", "message": "I am unable...", "timestamp": "..." },
      { "id": "uuid", "sender": "AI",   "message": "Hello! I understand...", "timestamp": "..." }
    ]
  }
}
```

---

### `GET /api/tickets`

List all tickets, sorted by most recently updated. Supports filtering and pagination.

**Query Parameters:**

| Param | Values | Default |
|---|---|---|
| `category` | `All` \| `Technical` \| `Billing` \| `Account` \| `General` | `All` |
| `status` | `All` \| `Open` \| `Closed` \| `AI Responded` \| `Waiting For User` \| `Resolved` | `All` |
| `page` | integer ≥ 1 | `1` |
| `limit` | 1–100 | `20` |

**Example:**
```
GET /api/tickets?category=Technical&status=Open&page=1&limit=10
```

**Response `200`:**
```json
{
  "tickets": [
    {
      "id": "TKT-AB12CD34",
      "customerName": "Jane Smith",
      "category": "Technical",
      "status": "Open",
      "subject": "Cannot access my account",
      "messageCount": 3,
      "createdAt": "...",
      "updatedAt": "...",
      "messages": []
    }
  ]
}
```

---

### `GET /api/tickets/:id`

Get a single ticket with its full message thread.

**Example:**
```
GET /api/tickets/TKT-AB12CD34
```

**Response `200`:** Full ticket object with all messages.

**Response `404`:**
```json
{ "error": "Ticket not found", "code": "NOT_FOUND" }
```

---

### `POST /api/tickets/:id/messages`

Add a user message to the ticket thread. After this, call the **SSE stream endpoint** to get the AI response.

**Request Body:**
```json
{ "message": "I tried clearing the cache but still getting the error." }
```

**Response `201`:** Updated ticket object.

**Response `400`** (if ticket is closed):
```json
{ "error": "Cannot add messages to a resolved or closed ticket", "code": "TICKET_CLOSED" }
```

---

### `GET /api/tickets/:id/chat-stream`

**SSE Streaming endpoint** — streams the AI's response in real time.

Connect using `EventSource` in the browser:

```javascript
const es = new EventSource('/api/tickets/TKT-AB12CD34/chat-stream');

es.addEventListener('chunk', (e) => {
  const { chunk } = JSON.parse(e.data);
  // Append chunk to UI
});

es.addEventListener('done', (e) => {
  const { ticket } = JSON.parse(e.data);
  // Full AI message saved — update UI with final ticket state
  es.close();
});

es.addEventListener('error', (e) => {
  const { error } = JSON.parse(e.data);
  es.close();
});
```

**SSE Event Types:**

| Event | Payload | Description |
|---|---|---|
| `connected` | `{}` | Connection established |
| `chunk` | `{ chunk: "Hello" }` | One text chunk from OpenAI stream |
| `done` | `{ ticket: {...} }` | Stream complete — AI message saved to DB |
| `error` | `{ error: "..." }` | Something went wrong |

> **Note:** The last user message in the DB is used as the new message context. Always call `POST /messages` first, then open the SSE stream.

---

### `PUT /api/tickets/:id/resolve`

Mark a ticket as **Resolved**. No request body needed.

**Response `200`:** Updated ticket with `status: "Resolved"`.

---

### `PUT /api/tickets/:id/close`

Mark a ticket as **Closed**. No request body needed.

**Response `200`:** Updated ticket with `status: "Closed"`.

---

## 🤖 OpenAI Integration

Three methods in `src/services/aiService.js`:

### `classifyTicket(subject, question)`
- **Model:** `gpt-4o-mini`
- **Mode:** Non-streaming, JSON structured output (`response_format: { type: 'json_object' }`)
- **Returns:** One of `Technical` | `Billing` | `Account` | `General`
- **Temperature:** `0.1` (deterministic classification)

### `generateInitialResponse(category, subject, question)`
- **Model:** `gpt-4o`
- **Mode:** Non-streaming
- **Returns:** Full markdown-formatted string (2–4 paragraphs)
- **Temperature:** `0.7` (natural, helpful tone)
- Uses category-specific system prompts for technical/billing/account/general context

### `generateConversationResponse(history, newMessage, category)`
- **Model:** `gpt-4o`
- **Mode:** `stream: true` — returns an async iterable
- **Input:** Full message history as OpenAI message array + new user message
- **Returns:** OpenAI stream object (iterated in controller, piped to SSE)
- **Temperature:** `0.7`

---

## 📜 Scripts Reference

| Command | Description |
|---|---|
| `npm run dev` | Start with **Nodemon** (auto-restarts on file changes) |
| `npm start` | Start in production mode (no auto-restart) |
| `npm run migrate` | Run all pending database migrations |
| `npm run migrate:rollback` | Roll back the last batch of migrations |
| `npm run migrate:make <name>` | Create a new migration file |

---

## 🌐 CORS Configuration

Controlled by `CORS_ORIGIN` in `.env`:

| Value | Behaviour |
|---|---|
| `*` | Allow **all origins** (default) — great for development |
| `https://myapp.com` | Allow only this specific origin |
| `https://app.com,https://admin.com` | Allow multiple specific origins |

> ⚠️ When `CORS_ORIGIN=*`, the `credentials` header is automatically disabled (browser spec requirement). If you need `credentials: true` (cookies/auth headers), use a specific origin instead.
#   t i c k e t _ s u p p o r t _ a i _ n o d e  
 