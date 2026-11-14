// =============================================================================
// CsrfHeaderMiddleware.cs: CSRF protection via a required custom header
// =============================================================================
//
// CSRF ("cross-site request forgery"): a malicious web page makes the
// victim's browser send a request to OUR API. Because browsers attach
// cookies automatically, the request would arrive logged in as the victim.
//
// Defence used here (OWASP "custom request header" pattern):
//   Every state-changing request (POST/PUT/PATCH/DELETE) must carry the
//   header  X-EMS-CSRF: 1.
//
// Why that works:
//   - An HTML <form> on another site can't add custom headers at all.
//   - JavaScript on another site CAN try (fetch with a custom header), but a
//     custom header forces the browser to ask our API first ("CORS preflight"),
//     and our CORS policy only says yes to the origins in Cors:AllowedOrigins.
//     So the real request is never sent.
//
// Together with the SameSite=Strict cookie (AuthSetup.cs) this is two
// independent layers. Our frontend adds the header to every request
// (frontend/src/services/api.ts).
// -----------------------------------------------------------------------------

using Microsoft.AspNetCore.Mvc;

namespace EMS.Api.Security;

// A middleware is one step in the request pipeline: it can inspect the
// request, stop it, or pass it to the next step (`next`).
public sealed class CsrfHeaderMiddleware(RequestDelegate next)
{
    public const string HeaderName = "X-EMS-CSRF";

    public async Task InvokeAsync(HttpContext context, IProblemDetailsService problemDetails)
    {
        var method = context.Request.Method;

        // "Safe" methods only READ data, so they can't be abused to change
        // anything. OPTIONS is the CORS preflight itself.
        var isSafe = HttpMethods.IsGet(method) || HttpMethods.IsHead(method)
                  || HttpMethods.IsOptions(method) || HttpMethods.IsTrace(method);

        if (isSafe || context.Request.Headers.ContainsKey(HeaderName))
        {
            await next(context);
            return;
        }

        // Missing header on a state-changing request: refuse it.
        context.Response.StatusCode = StatusCodes.Status403Forbidden;
        await problemDetails.WriteAsync(new ProblemDetailsContext
        {
            HttpContext = context,
            ProblemDetails = new ProblemDetails
            {
                Status = StatusCodes.Status403Forbidden,
                Title = "Missing CSRF header.",
                Detail = $"State-changing requests must include the '{HeaderName}' header.",
            },
        });
    }
}
