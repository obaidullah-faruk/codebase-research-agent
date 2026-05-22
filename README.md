# Codebase Research Agent

A Django REST API that accepts natural language questions about GitHub repositories and answers them using an LLM-powered agent. The agent runs as a Celery background task, uses LangGraph for orchestration, and persists findings to PostgreSQL.

---

## Quick Start (Docker)

```bash
# 1. Copy the environment file and set your secrets
cp backend/.env.example backend/.env

# 2. Build images and start all 4 services (db, redis, web, worker)
cd backend && docker compose up --build -d

# 3. Submit a question
curl -s -X POST http://localhost:8000/api/v1/sessions/ \
  -H "Content-Type: application/json" \
  -d '{"repo_url": "https://github.com/psf/requests", "question": "How does retry logic work?"}'
# → {"id": "<uuid>", "status": "pending", ...}

# 4. Poll until status is "completed"
curl -s http://localhost:8000/api/v1/sessions/<uuid>/
# → {"id": "...", "status": "completed", "answer": "...", ...}
```

The worker processes the question in the background. Typical turnaround is 30–90 seconds depending on the LLM backend and question complexity.

---

## API Reference

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/sessions/` | List all research sessions |
| `POST` | `/api/v1/sessions/` | Create and queue a new session |
| `GET` | `/api/v1/sessions/<uuid>/` | Retrieve a session with findings, tool calls, and logs |
| `POST` | `/api/v1/sessions/<uuid>/cancel/` | Cancel a pending or running session |

### Create a session

```bash
curl -s -X POST http://localhost:8000/api/v1/sessions/ \
  -H "Content-Type: application/json" \
  -d '{"repo_url": "https://github.com/django/django", "question": "Where is the ORM query compiler defined?"}'
```

Response (`201 Created`):
```json
{
  "id": "3f7a...",
  "status": "pending",
  "question": "Where is the ORM query compiler defined?",
  "repository_url": "https://github.com/django/django",
  "repository_name": "django/django",
  "answer": "",
  "findings": [],
  "tool_calls": [],
  "logs": [],
  "created_at": "2024-01-01T00:00:00Z",
  "completed_at": null,
  "tokens_used": 0,
  "iterations": 0
}
```

### Retrieve a session

```bash
curl -s http://localhost:8000/api/v1/sessions/3f7a.../
```

### Cancel a session

```bash
curl -s -X POST http://localhost:8000/api/v1/sessions/3f7a.../cancel/
# → {"detail": "Session cancelled."}
```

Interactive API docs (Swagger UI): `http://localhost:8000/api/v1/docs/`

---

## Architecture

### Two-app structure

**`backend/research_sessions/`** — HTTP layer and data ownership
- `models.py`: `Repository`, `ResearchSession`, `Finding`, `ToolCallLog`, `SessionLog`
- `views.py` → `services.py` → queues a Celery task; that is the only coupling point to `agent/`
- Admin is read-only (all `has_add_permission` return `False`)

**`backend/agent/`** — All AI logic
- `backends/`: `get_llm()` returns a `BaseChatModel` (`ChatOllama` or `ChatBedrock`)
- `tools/`: 7 LangChain `StructuredTool` objects bound per-session
- `graph/`: LangGraph state machine
- `tasks.py`: Celery task that manages the full session lifecycle

### LangGraph flow

```
START
  │
  ▼
call_model ──────────────────────────────────────────┐
  │                                                   │
  ▼                                                   │
should_continue?                                      │
  ├── tool_calls present ──► execute_tools ───────────┘
  ├── max iterations (15)  ──► END
  ├── time budget (75 s)   ──► END
  └── no tool_calls        ──► END
```

### The 7 tools

| Tool | Type | Description |
|------|------|-------------|
| `list_files` | GitHub | List files/directories at a path in the repo |
| `read_file` | GitHub | Read the contents of a file (truncated to `AGENT_MAX_FILE_CHARS`) |
| `search_code` | GitHub | Search for a string across the repository |
| `get_file_summary` | GitHub | Get a short summary of a file's purpose |
| `save_finding` | DB | Persist a notable finding to the database |
| `get_previous_findings` | DB | Retrieve findings saved earlier in the same session |
| `list_past_sessions` | DB | List previous sessions for the same repository |

All tools are bound with `repo_url` or `session_id` at task start via `functools.partial`.

### Request flow

```
POST /api/v1/sessions/
  → views.py → services.create_session()
    → ResearchSession created (status=pending)
    → run_research_task.delay(session_id)   # queued to Redis

Celery worker picks up task:
  → compile_graph(repo_url, session_id)
    → builds 7 tools bound to this session
    → get_llm().bind_tools(tools)
  → graph.invoke(initial_state)
  → session.status = completed, answer saved
```

---

## Configuration Reference

Copy `backend/.env.example` to `backend/.env` and adjust as needed. All settings have safe defaults for local development.

| Env var | Default | Effect |
|---------|---------|--------|
| `DJANGO_SECRET_KEY` | auto-generated | Django secret key — set a fixed value in production |
| `DEBUG` | `False` | Enable Django debug mode |
| `DATABASE_URL` | `sqlite:///db.sqlite3` | PostgreSQL URL in production (set automatically by Docker Compose) |
| `REDIS_URL` | `redis://localhost:6379/0` | Redis broker URL |
| `LLM_BACKEND` | `ollama` | `ollama` or `bedrock` |
| `OLLAMA_MODEL` | `qwen2.5:14b` | Ollama model name |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama server endpoint |
| `BEDROCK_MODEL` | `us.amazon.nova-lite-v1:0` | AWS Bedrock model ID |
| `BEDROCK_REGION` | `us-east-1` | AWS region for Bedrock |
| `AWS_ACCESS_KEY_ID` | _(empty)_ | AWS credentials for Bedrock |
| `AWS_SECRET_ACCESS_KEY` | _(empty)_ | AWS credentials for Bedrock |
| `GITHUB_TOKEN` | _(empty)_ | GitHub token — raises rate limit from 60 to 5 000 req/hr |
| `AGENT_MAX_ITERATIONS` | `15` | Max LLM calls per session before forced answer |
| `AGENT_TOKEN_BUDGET` | `80000` | Token budget before forced answer |
| `AGENT_MAX_FILE_CHARS` | `8000` | Truncation limit for file reads |
| `TOOL_RESULT_MAX_CHARS` | `3000` | Truncation limit for tool results stored in messages |

---

## Switching LLM Backends

### Ollama (default — local, no API cost)

Requires [Ollama](https://ollama.com) running on the host machine.

```env
LLM_BACKEND=ollama
OLLAMA_MODEL=qwen2.5:14b
OLLAMA_BASE_URL=http://host.docker.internal:11434
```

Pull the model before starting:

```bash
ollama pull qwen2.5:14b
```

### Amazon Bedrock

Requires AWS credentials with Bedrock access in the target region.

```env
LLM_BACKEND=bedrock
BEDROCK_MODEL=us.amazon.nova-lite-v1:0
BEDROCK_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIAxxx
AWS_SECRET_ACCESS_KEY=xxx
```

No local GPU or model download required. Charges apply per token on the AWS account.

---

## Running Tests

Run from the `backend/` directory:

```bash
cd backend

# Run the full test suite
docker compose run --rm web python manage.py test tests

# Run a single test module
docker compose run --rm web python manage.py test tests.agent.test_graph_edges
docker compose run --rm web python manage.py test tests.research_sessions.test_views
```

The test suite uses Django's test runner with an isolated PostgreSQL database. All LLM calls are mocked — no live API calls are made during tests.

| Module | What it covers |
|--------|----------------|
| `tests.agent.test_backends` | `get_llm()` returns correct type for each backend; raises on unknown |
| `tests.agent.test_tools` | `build_tools()` returns exactly 7 tools, all with `invoke` |
| `tests.agent.test_graph_edges` | All 4 exit conditions of `should_continue` |
| `tests.research_sessions.test_models` | `Repository.__str__`, default status, `Finding.confidence`, `SessionLog` kinds |
| `tests.research_sessions.test_views` | Create (201), missing fields (400), list (200), detail (200), not found (404) |
| `tests.research_sessions.test_services` | Repo created/reused, task queued once, status is pending |

---

## Admin UI

URL: `http://localhost:8000/admin/`

Log in with the superuser credentials set in `backend/.env`. Create the superuser account (from `backend/`) with:

```bash
docker compose run --rm web python manage.py createsuperuser --noinput
```

The admin is **read-only** — no records can be created or edited through it. It is intended for inspecting session state, findings, and tool call logs during debugging.

| Model | Description |
|-------|-------------|
| `Repository` | GitHub repos that have been queried |
| `ResearchSession` | Each question submitted, with status and answer |
| `Finding` | Notable facts the agent discovered, with confidence score |
| `ToolCallLog` | Every tool call made during a session, with inputs and outputs |
| `SessionLog` | Timeline events: `start`, `tool_call`, `answer`, `error` |
