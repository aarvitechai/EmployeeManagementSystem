// =============================================================================
// ConcurrencyExtensions.cs: plug the client's RowVersion into EF Core
// =============================================================================
//
// How optimistic concurrency works in this API:
//   1. GET returns the record including its current `rowVersion`.
//   2. The client edits the record and sends that SAME rowVersion back.
//   3. We tell EF Core "the version the client saw was X" (this method).
//   4. EF Core runs: UPDATE ... WHERE Id = @id AND RowVersion = X
//   5. If someone else saved in between, RowVersion is no longer X, so 0 rows
//      match and EF Core throws DbUpdateConcurrencyException. The API
//      returns 409 Conflict ("reload and try again") instead of silently
//      overwriting the other person's changes.
// -----------------------------------------------------------------------------

using EMS.Application.Abstractions;
using EMS.Domain.Common;

namespace EMS.Application.Common;

internal static class ConcurrencyExtensions
{
    public static void SetOriginalRowVersion<TEntity>(this IEmsDbContext db, TEntity entity, byte[] rowVersion)
        where TEntity : Entity
    {
        // "OriginalValue" is what EF Core believes is currently in the
        // database. EF Core puts it into the WHERE clause of the UPDATE.
        db.Entry(entity).Property(e => e.RowVersion).OriginalValue = rowVersion;
    }
}
