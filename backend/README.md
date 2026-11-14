# EMS Backend

ASP.NET Core 10 Web API for the Employee Management System. This project is
self-contained: it builds, runs, tests and deploys independently of the frontend.

## Prerequisites

- .NET SDK 10

## Structure

```
backend/
├── EMS.slnx
├── src/
│   ├── EMS.Api/            # Controllers, middleware, DI composition root, OpenAPI
│   ├── EMS.Application/    # Use cases, DTO mapping, validation
│   ├── EMS.Domain/         # Entities and business rules (no EF Core / HTTP)
│   ├── EMS.Infrastructure/ # EF Core, SQL Server, external adapters
│   └── EMS.Contracts/      # API request/response contracts
└── tests/
    └── EMS.UnitTests/
```

Dependencies: `Api → Application, Infrastructure, Contracts`, `Application → Domain, Contracts`,
`Infrastructure → Application, Domain`.

## Commands

Run from the `backend/` folder:

```bash
dotnet restore
dotnet build
dotnet test
dotnet run --project src/EMS.Api     # http://localhost:5131
```

- Health check: `GET /health`
- OpenAPI document (Development only): `GET /openapi/v1.json`

## Configuration

| Key | Purpose | Development default |
|---|---|---|
| `Cors:AllowedOrigins` | Frontend origins allowed to call the API | `http://localhost:3000` |

Override per environment with `appsettings.{Environment}.json` or environment variables,
e.g. `Cors__AllowedOrigins__0=https://ems.example.com`.
