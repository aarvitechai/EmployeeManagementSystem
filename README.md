# Employee Management System

This repository holds two independent projects. Each has its own dependencies,
configuration, build and deployment, and they communicate only over HTTP.

| Project | Stack | Docs |
|---|---|---|
| [`backend/`](backend/) | ASP.NET Core 10 Web API | [backend/README.md](backend/README.md) |
| [`frontend/`](frontend/) | Next.js + TypeScript | [frontend/README.md](frontend/README.md) |

Design: `Employee_Management_System_HLD_LLD.docx`.

## Quick start (local)

```bash
# terminal 1
cd backend && dotnet run --project src/EMS.Api      # http://localhost:5131

# terminal 2
cd frontend && cp .env.example .env.local && npm install && npm run dev   # http://localhost:3000
```

## Branches

`dev` → `staging` → `production`
