## Meal Planning Dashboard

Clean, light-themed meal planning workspace with a Node/Express API, Sequelize ORM, PostgreSQL, and a Vite/React client. Ships with Docker for local development and is designed so the database connection string can later point to Supabase.

### Tech Stack
- **Backend:** Node.js (Express 5), Sequelize ORM, Zod validation
- **Database:** PostgreSQL (Docker image locally, Supabase compatible later)
- **Frontend:** React + Vite


### Folder Structure
```
Meals/
├── backend/              # Express API, Sequelize models, seed script
├── frontend/             # Vite + React client
├── docker-compose.yml    # Backend, frontend, and Postgres services
└── README.md
```

## Getting Started

### 1. Environment Variables
```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```
Update `backend/.env` if you change database credentials or later switch to Supabase (see below).  
`LOCAL_DATABASE_URL` is used for local dev by default. Set `USE_REMOTE_DB=true` (and `DATABASE_URL`) only when you want to hit Supabase/Render.
> The backend auto-migrates tables on startup (`sequelize.sync({ alter: true })`). Set `DB_AUTO_MIGRATE=false` in `backend/.env` if you prefer to manage migrations manually.

### 2. Docker-first Workflow
```bash
docker compose up --build
```

Stop services with `Ctrl+C` and remove containers with `docker compose down`.

### 3. Running Without Docker

Backend:
```bash
cd backend
npm install
npm run dev
```

Frontend:
```bash
cd frontend
npm install
npm run dev
```

Ensure Postgres is running locally (or via Supabase) and matches the connection string in your backend `.env`.


## Key Commands
| Action | Command |
|-------|---------|
| Start everything via Docker | `docker compose up --build` |
| Backend only | `cd backend && npm run dev` |
| Frontend only | `cd frontend && npm run dev` |
| Seed sample data | `cd backend && npm run seed` |

## API Overview
- `POST /api/auth/login` → validates username
- `GET /api/meals`, `POST /api/meals`, `PUT /api/meals/:id`, `DELETE /api/meals/:id` → meal bank CRUD (with image metadata)
- `GET /api/rotation`, `PUT /api/rotation/config`, `POST/DELETE /api/rotation/entries`, `PATCH /api/rotation/entries/:id/servings` → rotation planner & serving controls
- `GET /api/grocery-list?weeks=1,2` → aggregated grocery view


## Frontend Scripts
- `npm run dev` – Vite dev server
- `npm run build` – production build (for future deployment)
- `npm run preview` – preview built assets

## Backend Scripts
- `npm run dev` – nodemon + Express
- `npm run start` – production start
- `npm run seed` – rebuild & seed database

