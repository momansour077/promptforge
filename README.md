# PromptForge

PromptForge is a full-stack prompt engineering application that turns rough English or Arabic ideas into structured, model-aware AI prompts. It includes secure cookie-based authentication, saved prompt history, collections, daily quota enforcement, Mistral-backed prompt enhancement, and a bilingual React dashboard with RTL support.

## Features

- React 18 + Vite frontend with Tailwind UI, Zustand state, i18next, and full Arabic RTL support
- Express + TypeScript backend with Prisma/PostgreSQL, Redis-backed quotas, JWT auth, CSRF protection, and Helmet/CORS hardening
- PromptBuilder engine that classifies intent, chooses a framework, and formats prompts for Claude, ChatGPT, Gemini, Copilot, and major image models
- Mistral Large wrapper with retries, error classification, JSON-schema response enforcement, and streaming support
- Prompt history, favorites, collections, user stats, usage charts, and offline history reading via a service worker
- Dockerized local stack plus GitHub Actions for CI and container deployment

## Architecture

```text
┌───────────────────────────────┐
│ Browser / PromptForge UI      │
│ React + Vite + Zustand + i18n │
└──────────────┬────────────────┘
               │ HTTPS / cookies / CSRF header
┌──────────────▼────────────────┐
│ Express API                   │
│ Auth · PromptBuilder · Swagger│
└───────┬───────────┬───────────┘
        │           │
        │           └──────────────► Mistral API
        │
        ├──────────────────────────► PostgreSQL via Prisma
        │
        └──────────────────────────► Redis for quotas and session cache
```

## Project layout

```text
promptforge/
├── apps/
│   ├── backend/
│   └── frontend/
├── docker-compose.yml
├── .env.example
└── .github/workflows/
```

## Prerequisites

- Node.js 20+
- npm 10+
- Docker Engine with Compose support
- Mistral API key

## Local development

1. Copy `.env.example` to `.env` and fill in the required secrets.
2. Install backend dependencies:
   `cd apps/backend && npm install`
3. Install frontend dependencies:
   `cd apps/frontend && npm install`
4. Start infrastructure with Docker:
   `docker compose up -d postgres redis`
5. Run Prisma migration:
   `cd apps/backend && npx prisma migrate deploy --schema src/prisma/schema.prisma`
6. Start the backend:
   `cd apps/backend && npm run dev`
7. Start the frontend:
   `cd apps/frontend && npm run dev`
8. Open `http://localhost:5173` for the Vite dev UI or `http://localhost:8080` when running the full container stack.

## Full container stack

Run the full application with:

```bash
docker compose up --build
```

The public UI is exposed on `http://localhost:8080`. PostgreSQL and Redis remain internal to the Compose network.

## Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `NODE_ENV` | Yes | `development`, `test`, or `production` |
| `PORT` | Yes | Backend port |
| `DATABASE_URL` | Yes | Prisma PostgreSQL connection string |
| `REDIS_URL` | Yes | Redis connection string |
| `JWT_SECRET` | Yes | Access-token signing secret |
| `JWT_REFRESH_SECRET` | Yes | Refresh-token signing secret |
| `JWT_EXPIRES_IN` | Yes | Access token lifetime, e.g. `15m` |
| `JWT_REFRESH_EXPIRES_IN` | Yes | Refresh token lifetime, e.g. `7d` |
| `MISTRAL_API_KEY` | Yes | Mistral API key |
| `MISTRAL_BASE_URL` | No | Mistral API base URL |
| `MISTRAL_MODEL` | No | Default model id, e.g. `mistral-large-latest` |
| `RATE_LIMIT_FREE_DAILY` | Yes | Daily prompt cap for free users |
| `RATE_LIMIT_PRO_DAILY` | Yes | Daily prompt cap for pro users |
| `FRONTEND_URL` | Yes | Canonical frontend origin |
| `CORS_ORIGINS` | Yes | Comma-separated allowed browser origins |
| `COOKIE_DOMAIN` | No | Cookie domain override; leave blank locally |
| `ACCESS_COOKIE_NAME` | No | Access-token cookie name |
| `REFRESH_COOKIE_NAME` | No | Refresh-token cookie name |
| `CSRF_COOKIE_NAME` | No | CSRF double-submit cookie name |
| `LOG_LEVEL` | No | Pino log level |
| `PUBLIC_RATE_LIMIT_WINDOW_MS` | No | Express public rate-limit window |
| `PUBLIC_RATE_LIMIT_MAX` | No | Express public rate-limit max requests |
| `API_BASE_PATH` | No | API mount path, defaults to `/api` |
| `VITE_API_BASE_URL` | Yes for the frontend | Browser-facing API base URL |

## Scripts

### Backend

- `npm run dev`
- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`

### Frontend

- `npm run dev`
- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`

## Testing

Backend:

```bash
cd apps/backend
npm test
```

Frontend:

```bash
cd apps/frontend
npm test
```

## Build for production

Backend:

```bash
cd apps/backend
npm run build
```

Frontend:

```bash
cd apps/frontend
npm run build
```

## API reference

| Area | Method | Path | Purpose |
| --- | --- | --- | --- |
| Auth | `POST` | `/api/auth/register` | Register and set auth cookies |
| Auth | `POST` | `/api/auth/login` | Login and set auth cookies |
| Auth | `POST` | `/api/auth/refresh` | Rotate session tokens |
| Auth | `POST` | `/api/auth/logout` | Invalidate session |
| Auth | `GET` | `/api/auth/me` | Current user profile |
| Prompts | `POST` | `/api/prompts/generate` | Generate and store a prompt |
| Prompts | `GET` | `/api/prompts/history` | Prompt history with filters |
| Prompts | `GET` | `/api/prompts/:id` | Single prompt lookup |
| Prompts | `PATCH` | `/api/prompts/:id/favorite` | Toggle favorite |
| Prompts | `DELETE` | `/api/prompts/:id` | Delete prompt |
| Prompts | `GET` | `/api/prompts/public` | Public prompt browsing |
| Collections | `GET` | `/api/collections` | List collections |
| Collections | `POST` | `/api/collections` | Create collection |
| Collections | `GET` | `/api/collections/:id` | Collection details |
| Collections | `PUT` | `/api/collections/:id` | Update collection |
| Collections | `DELETE` | `/api/collections/:id` | Delete collection |
| Collections | `POST` | `/api/collections/:id/prompts` | Add prompt to collection |
| User | `GET` | `/api/user/stats` | Usage metrics |
| User | `PUT` | `/api/user/profile` | Update display name/language |
| User | `PUT` | `/api/user/password` | Change password |
| User | `GET` | `/api/user/quota` | Current quota and reset time |

Swagger documentation is served from `/api/docs`.

## Security notes

- Passwords are hashed with bcrypt cost factor 12
- Access and refresh JWTs are stored in `httpOnly` cookies
- CSRF protection uses a double-submit cookie header pattern
- Helmet is enabled for HTTP hardening
- CORS is restricted to configured origins
- Request payload size is limited to 10 KB
- Prisma parameterizes queries, which protects standard SQL injection paths

## Deployment

The provided `deploy.yml` workflow builds backend and frontend images, pushes them to GHCR, and deploys them over SSH.

Required GitHub secrets:

- `DEPLOY_HOST`
- `DEPLOY_USER`
- `DEPLOY_SSH_KEY`
- `DEPLOY_PATH`

The remote server should already contain:

- a checked-out copy of this repository
- a populated `.env`
- Docker with Compose support

## Contributing

1. Create a feature branch.
2. Keep backend and frontend builds passing.
3. Run both test suites before opening a pull request.
4. Document any new environment variables or deployment behavior in this README.
