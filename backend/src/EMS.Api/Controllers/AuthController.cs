// =============================================================================
// AuthController.cs: login, logout and "who am I?"
// =============================================================================
//
//   POST /api/v1/auth/login    check email + password, set the login cookie
//   POST /api/v1/auth/logout   remove the login cookie
//   GET  /api/v1/auth/me       the current user (401 if not logged in)
//
// The cookie is HttpOnly, so the frontend can't read it. It calls /me to
// find out whether someone is logged in and which roles they have.
// -----------------------------------------------------------------------------

using System.Security.Claims;
using EMS.Contracts.Auth;
using EMS.Infrastructure.Identity;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace EMS.Api.Controllers;

[ApiController]
[Route("api/v1/auth")]
[Produces("application/json")]
public sealed class AuthController(
    SignInManager<AppUser> signInManager,
    UserManager<AppUser> userManager) : ControllerBase
{
    // [AllowAnonymous]: you obviously can't be logged in before logging in.
    // [EnableRateLimiting]: max 10 login attempts per minute per IP address
    // (policy defined in Program.cs), which slows down password guessing.
    [HttpPost("login")]
    [AllowAnonymous]
    [EnableRateLimiting(LoginRateLimitPolicy)]
    [ProducesResponseType<CurrentUserResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<ActionResult<CurrentUserResponse>> Login(LoginRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrEmpty(request.Password))
            return Problem(statusCode: StatusCodes.Status400BadRequest, title: "Email and password are required.");

        var user = await userManager.FindByEmailAsync(request.Email.Trim());

        // SECURITY: the SAME message whether the email is unknown or the
        // password is wrong, so attackers can't discover which emails exist.
        if (user is null)
            return InvalidCredentials();

        // Checks the password against the stored HASH, counts failures for
        // lockout (lockoutOnFailure: true), and on success writes the cookie.
        var result = await signInManager.PasswordSignInAsync(
            user, request.Password, isPersistent: request.RememberMe, lockoutOnFailure: true);

        if (result.IsLockedOut)
            return Problem(
                statusCode: StatusCodes.Status401Unauthorized,
                title: "Account locked.",
                detail: "Too many failed attempts. Try again in 15 minutes.");

        if (!result.Succeeded)
            return InvalidCredentials();

        // HttpContext.User is not updated until the NEXT request (the cookie
        // was only just written), so load the roles directly.
        var roles = await userManager.GetRolesAsync(user);
        return Ok(new CurrentUserResponse(user.Email ?? request.Email, roles.ToArray()));
    }

    // AllowAnonymous so logging out never fails, even with an expired session.
    [HttpPost("logout")]
    [AllowAnonymous]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Logout()
    {
        // Tells the browser to delete the login cookie.
        await signInManager.SignOutAsync();
        return NoContent();
    }

    // No attribute here: the FALLBACK policy (AuthSetup.cs) requires a logged-in
    // user, so anonymous callers automatically get 401.
    [HttpGet("me")]
    [ProducesResponseType<CurrentUserResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public ActionResult<CurrentUserResponse> Me()
    {
        // `User` = the ClaimsPrincipal rebuilt from the cookie. CLAIMS are
        // facts about the user stored inside the (encrypted) cookie: name,
        // id, roles... ClaimTypes.Role claims hold the role names.
        var email = User.Identity?.Name ?? string.Empty;
        var roles = User.FindAll(ClaimTypes.Role).Select(c => c.Value).ToArray();
        return Ok(new CurrentUserResponse(email, roles));
    }

    public const string LoginRateLimitPolicy = "login";

    private ObjectResult InvalidCredentials() =>
        Problem(statusCode: StatusCodes.Status401Unauthorized, title: "Invalid email or password.");
}
