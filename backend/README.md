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
- **Login required:** every endpoint except `/health` needs a logged-in user (see below).

### Request flow

```
HTTP -> Controller (EMS.Api) -> Service + Validator (EMS.Application) -> Entity rules (EMS.Domain)
                                        |
                                        +-> IEmsDbContext -> EmsDbContext (EMS.Infrastructure) -> SQL Server
```

## Authentication and authorization

ASP.NET Core Identity with an **HttpOnly, SameSite=Strict cookie** (`ems_auth`). No tokens are
stored in the browser's JavaScript. See `src/EMS.Api/Security/AuthSetup.cs`.

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/auth/login` | `{ email, password, rememberMe }`, sets the cookie, returns `{ email, roles }` |
| POST | `/auth/logout` | Removes the cookie (204) |
| GET | `/auth/me` | Current user, or 401 |

- **Roles:** `SystemAdmin`, `HRAdmin`, `Manager`, `Employee`.
  - Read employees/departments: SystemAdmin, HRAdmin, Manager (policy `ViewOrganization`).
  - Create / edit / status / delete: SystemAdmin, HRAdmin (policy `ManageOrganization`).
  - Everything else requires a logged-in user (fallback policy).
- **401 vs 403:** 401 = not logged in, 403 = logged in but not allowed.
- **CSRF:** POST/PUT/PATCH/DELETE must send the header `X-EMS-CSRF: 1`, otherwise 403.
- **Brute force protection:** 5 wrong passwords lock the account for 15 minutes; login is
  rate-limited to 10 attempts per minute per IP (429).
- **Same site required:** because the cookie is SameSite=Strict, the frontend and API must share a
  registrable domain (e.g. `app.example.com` + `api.example.com`; locally both are `localhost`).
- **Not yet done:** linking a login to an Employee record, and limiting managers to their own team.

### Demo accounts (Development)

At startup the API creates the four roles and any accounts listed under `SeedUsers` in
configuration. Passwords are kept in **.NET user secrets** (outside the repository), never in git:

```bash
dotnet user-secrets list --project src/EMS.Api           # show configured seed users
dotnet user-secrets set "SeedUsers:0:Email" "admin@ems.local" --project src/EMS.Api
dotnet user-secrets set "SeedUsers:0:Password" "<a strong password>" --project src/EMS.Api
dotnet user-secrets set "SeedUsers:0:Role" "SystemAdmin" --project src/EMS.Api
```

Passwords need at least 10 characters with upper case, lower case, a digit and a symbol. Existing
accounts are never changed by the seeder.

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
