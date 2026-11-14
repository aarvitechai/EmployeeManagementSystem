// =============================================================================
// Program.cs: the entry point and "composition root" of the EMS API
// =============================================================================
//
// It runs in two phases:
//   1. BUILD:  register services (DI) and read configuration.
//   2. RUN:    configure the HTTP pipeline (middleware) and map endpoints.
// -----------------------------------------------------------------------------

using EMS.Infrastructure;
using EMS.Infrastructure.Persistence;

const string FrontendCorsPolicy = "Frontend";

// Creates the app builder. It loads configuration automatically from
// appsettings.json, appsettings.{Environment}.json, user secrets (in
// Development) and environment variables, in that order (later wins).
var builder = WebApplication.CreateBuilder(args);

// ---- 1. Service registration ------------------------------------------------

// Allowed frontend origins come from configuration (Cors:AllowedOrigins),
// so the frontend can be hosted anywhere without code changes.
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];

builder.Services.AddCors(options =>
{
    options.AddPolicy(FrontendCorsPolicy, policy =>
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials());
});

// Infrastructure layer: EF Core + SQL Server (EmsDbContext). See
// EMS.Infrastructure/DependencyInjection.cs.
builder.Services.AddInfrastructure(builder.Configuration);

builder.Services.AddControllers();

// Health checks power GET /health. AddDbContextCheck runs a tiny query
// through EmsDbContext, so /health reports "Unhealthy" if SQL Server is down
// or the connection string is wrong.
builder.Services.AddHealthChecks()
    .AddDbContextCheck<EmsDbContext>("database");

// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

var app = builder.Build();

// ---- 2. HTTP pipeline (order matters: each request flows top to bottom) ----

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();

app.UseCors(FrontendCorsPolicy);

app.UseAuthorization();

app.MapHealthChecks("/health");
app.MapControllers();

app.Run();
