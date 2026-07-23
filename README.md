# Ajaia Docs

A minimal full-stack document editor with rich-text editing, file upload, and sharing.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for design decisions and project structure, and [AI_WORKFLOW.md](./AI_WORKFLOW.md) for how AI tools were used during development.

## Tech Stack

| Layer       | Choice                        |
|-------------|-------------------------------|
| Backend     | Bun + TypeScript + Elysia     |
| Database    | PostgreSQL                    |
| Frontend    | React + TypeScript + Vite     |
| Editor      | TipTap (ProseMirror)          |
| Styling     | Plain CSS (minimalist)        |
| Auth        | Mock login with seeded users  |

## Setup

### Prerequisites
- [Bun](https://bun.sh) >= 1.2
- PostgreSQL running locally on port 5432

### 1. Database
```bash
createdb ajaia_docs
# Or: psql -c "CREATE DATABASE ajaia_docs;"
```

### 2. Backend
```bash
cd backend
bun install            # Installs deps + generates Prisma client
bunx prisma db push    # Create tables from Prisma schema
bun run db:seed        # Create sample users + documents
bun run dev            # Starts on :3001
```

### 3. Frontend
```bash
cd frontend
bun install
bun run dev           # Starts on :5173, proxies /api to :3001
```

### 4. Open
Visit `http://localhost:5173` and click one of the demo users (Alice, Bob, or Carol) to sign in — there's no password or email entry. Switch users or sign out from the avatar menu in the top-right corner.

## Testing
```bash
cd backend
bunx prisma db push  # Ensure DB schema is current
bun test             # Requires DB running
```

## Deployment Path
Preferred deployment path is a split deploy:

1. Backend on Render (or Railway) as a Bun web service
2. PostgreSQL via managed provider (Render Postgres, Railway Postgres, or Supabase)
3. Frontend on Vercel as a static/Vite app

Render (backend):
- Build command: `bun install && bunx prisma db push` (installs deps, generates the Prisma client via `postinstall`, and syncs the schema)
- Start command: `bun run start`
- Environment variables: `DATABASE_URL` (managed Postgres connection string), `CORS_ORIGIN` (frontend URL, e.g. `https://your-app.vercel.app`)

Vercel (frontend):
- Build/output are auto-detected for Vite, no config needed
- Environment variable: `VITE_API_URL` set to the deployed backend's API base, e.g. `https://your-backend.onrender.com/api` (see `frontend/.env.example`; left unset locally, where it falls back to `/api` via the dev proxy)

This keeps setup low-cost while making the app accessible to reviewers without paid dependencies.

## File Upload
Supports `.txt` and `.md` files. Plain text is wrapped in paragraphs; markdown headers, bold, italic, and lists are converted to HTML. Upload via the button on the document list page.
