// =============================================================================
// Guard.cs: small reusable input checks for domain entities
// =============================================================================
//
// "Guard clauses" check inputs at the start of a method and throw straight
// away if something is wrong. Collecting them here avoids copy-pasting the
// same if/throw code into every entity.
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
            throw new ArgumentException("Value is required.", paramName);

        var trimmed = value.Trim();
        if (trimmed.Length > maxLength)
            throw new ArgumentException($"Must be at most {maxLength} characters.", paramName);

        return trimmed;
    }

    // Text that may be empty: blank input becomes null (stored as NULL).
    public static string? Optional(string? value, string paramName, int maxLength)
    {
        if (string.IsNullOrWhiteSpace(value))
            return null;

        var trimmed = value.Trim();
        if (trimmed.Length > maxLength)
            throw new ArgumentException($"Must be at most {maxLength} characters.", paramName);

        return trimmed;
    }

    // Foreign-key ids must point at a real (already saved) row, so they must be > 0.
    public static int PositiveId(int id, string paramName)
    {
        if (id <= 0)
            throw new ArgumentOutOfRangeException(paramName, "Id must be greater than zero.");

        return id;
    }
}
