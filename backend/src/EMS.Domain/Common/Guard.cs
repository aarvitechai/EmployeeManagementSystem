// =============================================================================
// Guard.cs: small reusable input checks for domain entities
// =============================================================================
//
// "Guard clauses" check inputs at the start of a method and throw straight
// away if something is wrong. Collecting them here avoids copy-pasting the
// same if/throw code into every entity.
//
// They throw DomainException (see DomainException.cs), which the API turns
// into a "400 Bad Request" response.
//
// `internal` = usable only inside the EMS.Domain project.
// -----------------------------------------------------------------------------

namespace EMS.Domain.Common;

internal static class Guard
{
    // Text that must be present: trims spaces and enforces a max length.
    public static string Required(string value, string paramName, int maxLength)
    {
        if (string.IsNullOrWhiteSpace(value))
            throw new DomainException($"{paramName}: Value is required.");

        var trimmed = value.Trim();
        if (trimmed.Length > maxLength)
            throw new DomainException($"{paramName}: Must be at most {maxLength} characters.");

        return trimmed;
    }

    // Text that may be empty: blank input becomes null (stored as NULL).
    public static string? Optional(string? value, string paramName, int maxLength)
    {
        if (string.IsNullOrWhiteSpace(value))
            return null;

        var trimmed = value.Trim();
        if (trimmed.Length > maxLength)
            throw new DomainException($"{paramName}: Must be at most {maxLength} characters.");

        return trimmed;
    }

    // Foreign-key ids must point at a real (already saved) row, so they must be > 0.
    public static int PositiveId(int id, string paramName)
    {
        if (id <= 0)
            throw new DomainException($"{paramName}: Id must be greater than zero.");

        return id;
    }
}
