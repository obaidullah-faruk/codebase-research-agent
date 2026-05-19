# Codebase Research Agent

A Django REST API that answers natural language questions about GitHub repositories using an LLM-powered agent.

## Quick Start (Docker)

```bash
# 1. Copy env file
cp .env.example .env

# 2. Build and start all services (db, redis, web, worker)
docker compose up --build -d

# 3. Check all 4 services are running
docker compose ps

# 4. Verify web is up
curl http://localhost:8000/admin/

# 5. Check worker started
docker compose logs worker | head -20

# 6. Stop when done
docker compose down
```

## Migrations

Run migrations after any model change:

```bash
# Generate a new migration file (writes to host via volume mount)
docker compose run --rm -v $(pwd):/app web python manage.py makemigrations

# Apply all pending migrations
docker compose run --rm web python manage.py migrate
```


## Admin Superuser

Create a superuser so you can log in at `http://localhost:8000/admin/`.

The `.env` file already contains the credentials. Just run:

```bash
docker compose run --rm web python manage.py createsuperuser --noinput
```

To change the defaults, edit these three variables in `.env` before running the command:

```env
DJANGO_SUPERUSER_USERNAME=admin
DJANGO_SUPERUSER_EMAIL=admin@example.com
DJANGO_SUPERUSER_PASSWORD=changeme
```

## Configuration

Edit `.env` to change settings. Only `DJANGO_SECRET_KEY` is required to change for production.

| Variable | Default | Description |
|---|---|---|
| `DJANGO_SECRET_KEY` | `change-me-in-production` | Django secret key — change in production |
| `LLM_BACKEND` | `ollama` | `ollama` or `bedrock` |
| `OLLAMA_BASE_URL` | `http://host.docker.internal:11434` | Ollama server endpoint |
| `OLLAMA_MODEL` | `qwen2.5:14b` | Ollama model name |
| `GITHUB_TOKEN` | _(empty)_ | GitHub token — raises rate limit from 60 to 5000 req/hr |
