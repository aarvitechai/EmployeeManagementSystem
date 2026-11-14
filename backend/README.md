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

## API endpoints

All endpoints are under `/api/v1`. Try them with `src/EMS.Api/EMS.Api.http`.

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/departments?includeInactive=false` | List departments |
| GET | `/departments/{id}` | Get one department |
| POST | `/departments` | Create a department (201) |
| PUT | `/departments/{id}` | Update name, description, active flag |
| DELETE | `/departments/{id}?rowVersion=...` | Soft delete (only when it has no employees) -> 204 |
| GET | `/employees` | Search / filter / sort / paginate employees |
| GET | `/employees/{id}` | Get one employee |
| POST | `/employees` | Create an employee (201) |
| PUT | `/employees/{id}` | Update details, department, manager |
| PATCH | `/employees/{id}/status` | Active / OnLeave / Terminated |
| DELETE | `/employees/{id}?rowVersion=...` | Soft delete (not while they manage others) -> 204 |

`GET /employees` query parameters: `page` (default 1), `pageSize` (1-100, default 20), `search`,
`departmentId`, `managerId`, `status`, `sortBy` (`lastName`, `firstName`, `employeeNumber`,
`hireDate`, `createdAt`) and `sortDirection` (`asc`/`desc`).

- **Errors** use RFC 9457 Problem Details: 400 validation / business rule, 404 not found,
  409 conflict (duplicate, invalid state, or concurrent edit).
- **Concurrency:** every response has a `rowVersion`. Send it back in PUT/PATCH bodies; if someone
  else saved the record in the meantime, the API returns 409 instead of overwriting their change.
- **Not yet secured:** authentication and authorization arrive in Phase 6.

### Request flow

```
HTTP -> Controller (EMS.Api) -> Service + Validator (EMS.Application) -> Entity rules (EMS.Domain)
                                        |
                                        +-> IEmsDbContext -> EmsDbContext (EMS.Infrastructure) -> SQL Server
```

## Database (EF Core + SQL Server)

- `EmsDbContext` lives in `src/EMS.Infrastructure/Persistence/` and is registered by
  `AddInfrastructure()` in `src/EMS.Infrastructure/DependencyInjection.cs`.
- Entity mappings go in `Persistence/Configurations/` (one class per entity).
- Migrations live in `Persistence/Migrations/`.
- Development database: `EMPMSDB` on `DESKTOP-2ERCDGB\MSSQLSERVER01` (Windows authentication).
- `GET /health` also checks the database connection.

Install the EF Core CLI once: `dotnet tool install --global dotnet-ef`

Run from the `backend/` folder:

```bash
# Create a migration after changing entities / configurations
dotnet ef migrations add <MigrationName> -p src/EMS.Infrastructure -s src/EMS.Api -o Persistence/Migrations

# Apply pending migrations to the database (creates EMPMSDB if missing)
dotnet ef database update -p src/EMS.Infrastructure -s src/EMS.Api

# Undo the last migration that has NOT been applied yet
dotnet ef migrations remove -p src/EMS.Infrastructure -s src/EMS.Api
```

`-p` (project) is where the DbContext and migrations live; `-s` (startup project) is where
configuration and the connection string are read from.

## Configuration

| Key | Purpose | Development default |
|---|---|---|
| `ConnectionStrings:EmsDb` | SQL Server connection string | `EMPMSDB` on `DESKTOP-2ERCDGB\MSSQLSERVER01` |
| `Cors:AllowedOrigins` | Frontend origins allowed to call the API | `http://localhost:3000` |

For staging/production set the connection string through an environment variable
(`ConnectionStrings__EmsDb=...`) instead of committing it.

Override per environment with `appsettings.{Environment}.json` or environment variables,
e.g. `Cors__AllowedOrigins__0=https://ems.example.com`.
