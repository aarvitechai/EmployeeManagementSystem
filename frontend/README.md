# EMS Frontend

Next.js (App Router) + TypeScript + Tailwind CSS frontend for the Employee Management
System. This project is self-contained: it installs, builds and deploys independently of
the backend and talks to it only over HTTP.

## Prerequisites

- Node.js 20+ and npm

## Structure

```
frontend/src/
├── app/          # route groups, pages, layouts
├── components/   # reusable UI
├── features/     # auth, employees, leave, departments
├── services/     # API client helpers (config.ts holds the API base URL)
├── store/        # Redux store and typed hooks
├── types/
└── validators/
```

## Setup

Run from the `frontend/` folder:

```bash
cp .env.example .env.local   # set NEXT_PUBLIC_API_BASE_URL
npm install
npm run dev                  # http://localhost:3000
npm run build && npm start   # production build
npm run lint
```

## Configuration

| Variable | Purpose | Default |
|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | Base URL of the EMS backend API | `http://localhost:5131` |

The backend must list this frontend's origin in its `Cors:AllowedOrigins` setting.
