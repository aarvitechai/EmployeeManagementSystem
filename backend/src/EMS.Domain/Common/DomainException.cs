// =============================================================================
// DomainException.cs: thrown when a business rule is broken
// =============================================================================
//
// Why a custom exception instead of ArgumentException / InvalidOperationException?
// .NET itself throws those for programming bugs too. If the API turned every
// InvalidOperationException into a "400 Bad Request", real bugs would be
// hidden as user errors. With our own type, the API's error handler can say
// precisely: "DomainException -> the request broke a business rule".
// -----------------------------------------------------------------------------

namespace EMS.Domain.Common;

public sealed class DomainException(string message) : Exception(message);
