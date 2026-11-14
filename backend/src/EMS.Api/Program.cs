// =============================================================================
// Program.cs: the entry point and "composition root" of the EMS API
// =============================================================================
//
// It runs in two phases:
//   1. BUILD:  register services (DI) and read configuration.
//   2. RUN:    configure the HTTP pipeline (middleware) and map endpoints.
// -----------------------------------------------------------------------------

using System.Threading.RateLimiting;
using EMS.Api.Controllers;
using EMS.Api.ErrorHandling;
using EMS.Api.Security;
using EMS.Application;
using EMS.Infrastructure;
using EMS.Infrastructure.Identity;
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

// Application layer: use-case services + FluentValidation validators. See
// EMS.Application/DependencyInjection.cs.
builder.Services.AddApplication();

// Infrastructure layer: EF Core + SQL Server (EmsDbContext). See
// EMS.Infrastructure/DependencyInjection.cs.
builder.Services.AddInfrastructure(builder.Configuration);

// Login (ASP.NET Core Identity + HttpOnly cookie) and role-based
// authorization policies. See Security/AuthSetup.cs.
builder.Services.AddEmsAuth(builder.Environment);

// RATE LIMITING: cap how often a client may call an endpoint. The "login"
// policy allows 10 attempts per minute per IP address ("fixed window").
// Request #11 within the minute gets 429 Too Many Requests.
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddPolicy(AuthController.LoginRateLimitPolicy, httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            // "Partition" = separate counter per IP address.
            partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 10,
                Window = TimeSpan.FromMinutes(1),
            }));
});

// Errors: every exception becomes a standard "Problem Details" JSON response
// (see ErrorHandling/GlobalExceptionHandler.cs). AddProblemDetails also makes
// plain error status codes (e.g. a 404 for an unknown URL) use that format.
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
builder.Services.AddProblemDetails();

builder.Services.AddControllers();

// Health checks power GET /health. AddDbContextCheck runs a tiny query
// through EmsDbContext, so /health reports "Unhealthy" if SQL Server is down
// or the connection string is wrong.
builder.Services.AddHealthChecks()
    .AddDbContextCheck<EmsDbContext>("database");

// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

var app = builder.Build();

// Create the roles, plus any accounts listed under "SeedUsers" in
// configuration (user secrets in Development). See Identity/IdentitySeeder.cs.
await IdentitySeeder.SeedAsync(app.Services, app.Configuration, app.Logger);

// ---- 2. HTTP pipeline (order matters: each request flows top to bottom) ----

// FIRST in the pipeline, so it can catch exceptions thrown by anything after
// it (controllers, services, EF Core) and hand them to GlobalExceptionHandler.
app.UseExceptionHandler();

// Returns Problem Details for error status codes that have no body, such as
// 404 for a URL that matches no endpoint.
app.UseStatusCodePages();

if (app.Environment.IsDevelopment())
{
    // AllowAnonymous: the API description is readable without logging in
    // (Development only), despite the "login required" fallback policy.
    app.MapOpenApi().AllowAnonymous();
}

app.UseHttpsRedirection();

app.UseCors(FrontendCorsPolicy);

// After CORS (so preflight requests are answered first), before anything
// that changes data. See Security/CsrfHeaderMiddleware.cs.
app.UseMiddleware<CsrfHeaderMiddleware>();

// AUTHENTICATION reads the login cookie and fills HttpContext.User.
// AUTHORIZATION then checks [Authorize] policies against that user.
// The order matters: you must know WHO someone is before deciding WHAT
// they may do.
app.UseAuthentication();
app.UseAuthorization();

app.UseRateLimiter();

// Monitoring tools must reach /health without logging in.
app.MapHealthChecks("/health").AllowAnonymous();
app.MapControllers();

app.Run();
