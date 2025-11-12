## Meal Planning Dashboard

Clean, light-themed meal planning workspace with a Node/Express API, Sequelize ORM, PostgreSQL, and a Vite/React client. Ships with Docker for local development and is designed so the database connection string can later point to Supabase.

### Tech Stack
- **Backend:** Node.js (Express 5), Sequelize ORM, Zod validation
- **Database:** PostgreSQL (Docker image locally, Supabase compatible later)
- **Frontend:** React + Vite
- **Auth:** Username-only check against a private allowlist (`kuato`, `noodle`, `father`, `boodle`)

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
> The backend auto-migrates tables on startup (`sequelize.sync({ alter: true })`). Set `DB_AUTO_MIGRATE=false` in `backend/.env` if you prefer to manage migrations manually.

### 2. Docker-first Workflow
```bash
docker compose up --build
```
- React dev server: http://localhost:5173
- API: http://localhost:4000/api
- Postgres: exposed on `localhost:5432` with user `meals_user`, password `meals_pass`, database `meals_db`

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

### 4. Seeding Example Data
To reset the database with the starter meals/ingredients and the four allowed users:
```bash
cd backend
npm run seed
```
> ⚠️ This wipes existing tables (`sequelize.sync({ force: true })`).

## Feature Highlights
- **Meal Bank:** Alphabetized, responsive gallery with collapsible meal cards. Each meal captures servings, optional imagery, and structured ingredient amounts (numeric value + unit like cup/tsp/tbsp/g/kg) so quantities can be scaled later.
- **Rotation Planner:** Choose 1, 2, or 4 week cycles, slot meals from the bank into each week, and adjust each week’s serving count on the fly — ingredient totals and the grocery list instantly scale to the new serving size.
- **Grocery List:** Pick the weeks to include, view aggregated ingredients grouped by category (with combined, unit-aware quantities) and see which meals use each ingredient. Check off items you already have, then export the remaining list for Woolworths.

## How to Use
1. **Meal Bank** – Add or search meals, tagging each with servings, preference, and ingredient quantities/units. Expand a card to see the ingredient list.
2. **Rotation** – Pick a 1/2/4 week rhythm, drop meals into each week via the dropdown, and tweak the serving input beside each meal to scale portions.
3. **Grocery List** – Select the weeks you want to shop for, tick off items already in your pantry, then export what remains for Woolworths. Each row shows combined totals plus the meals that need it, all within one scrollable card.

## Authentication
Only the four private usernames can log in. To add more, edit `backend/src/config/constants.js` (update the `ALLOWED_USERNAMES` array) and redeploy/reseed. There’s intentionally no public list or password reset flow. Every user has an isolated set of meals, ingredients, rotations, and grocery data—nothing leaks across accounts.

## Supabase Migration
1. Create a Supabase project with a Postgres database.
2. Grab the connection string (`postgres://USER:PASSWORD@HOST:PORT/DB`).
3. Update `DATABASE_URL` in `backend/.env` (or provide the individual `DB_*` vars).
4. Run migrations by starting the backend (`npm run dev` or Docker) — Sequelize will sync models automatically.
5. Deploy the backend to your hosting of choice and point the frontend’s `VITE_API_URL` at that deployment.

## Adding Users Later
- Update `ALLOWED_USERNAMES` in `backend/src/config/constants.js`.
- (Optional) rerun `npm run seed` to recreate the local DB with the updated users.
- The frontend will accept any username that matches the allowlist.

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

All authenticated requests must include the `x-user` header with the private username.

## Frontend Scripts
- `npm run dev` – Vite dev server
- `npm run build` – production build (for future deployment)
- `npm run preview` – preview built assets

## Backend Scripts
- `npm run dev` – nodemon + Express
- `npm run start` – production start
- `npm run seed` – rebuild & seed database

## Notes
- UI sticks to light mode, neutral palette, soft elevation, and ample white space (iOS-inspired).
- Swapping Postgres for Supabase later should be as simple as updating `DATABASE_URL`.
- The grocery export currently provides a text block you can copy/paste into the Woolworths list builder.
