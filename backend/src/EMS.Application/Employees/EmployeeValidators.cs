// =============================================================================
// EmployeeValidators.cs: input validation rules for employee requests
// =============================================================================
// See DepartmentValidators.cs for how FluentValidation works and why we
// validate in both the Application and Domain layers.
// -----------------------------------------------------------------------------

using EMS.Contracts.Employees;
using EMS.Domain.Employees;
using FluentValidation;

namespace EMS.Application.Employees;

// Rules shared by several validators, written once.
internal static class EmployeeRules
{
    // The allow-list of status names, taken from the Domain enum itself.
    public static readonly string[] StatusNames = Enum.GetNames<EmployeeStatus>();

    // `ignoreCase: true` accepts "active" as well as "Active".
    public static bool IsValidStatus(string? status) =>
        Enum.TryParse<EmployeeStatus>(status, ignoreCase: true, out _);

    // Extension method on FluentValidation's rule builder, so validators can
    // write `.ValidPersonName()` instead of repeating the same three rules.
    public static IRuleBuilderOptions<T, string> ValidPersonName<T>(this IRuleBuilder<T, string> rule) =>
        rule.NotEmpty().MaximumLength(Employee.NameMaxLength);

    public static IRuleBuilderOptions<T, string> ValidWorkEmail<T>(this IRuleBuilder<T, string> rule) =>
        rule.NotEmpty().MaximumLength(Employee.EmailMaxLength).EmailAddress();

    public static IRuleBuilderOptions<T, string?> ValidPhone<T>(this IRuleBuilder<T, string?> rule) =>
        rule.MaximumLength(Employee.PhoneMaxLength)
            // Digits, spaces, +, -, ( ). An empty value is allowed (phone is optional).
            .Matches(@"^[0-9+\-() ]*$")
            .WithMessage("Phone number may contain only digits, spaces and + - ( ).");
}

public sealed class CreateEmployeeRequestValidator : AbstractValidator<CreateEmployeeRequest>
{
    public CreateEmployeeRequestValidator()
    {
        RuleFor(x => x.EmployeeNumber)
            .NotEmpty()
            .MaximumLength(Employee.EmployeeNumberMaxLength)
            // Surrounding spaces are allowed; the entity trims them.
            .Matches(@"^\s*[A-Za-z0-9_-]+\s*$")
            .WithMessage("Employee number may contain only letters, digits, '-' and '_'.");

        RuleFor(x => x.FirstName).ValidPersonName();
        RuleFor(x => x.LastName).ValidPersonName();
        RuleFor(x => x.Email).ValidWorkEmail();
        RuleFor(x => x.PhoneNumber).ValidPhone();

        // `default` for DateOnly is 0001-01-01, i.e. the client forgot it.
        RuleFor(x => x.HireDate).NotEmpty();

        RuleFor(x => x.DepartmentId).GreaterThan(0);

        // `When` = only apply this rule if a manager was given at all.
        RuleFor(x => x.ManagerId).GreaterThan(0).When(x => x.ManagerId is not null);
    }
}

public sealed class UpdateEmployeeRequestValidator : AbstractValidator<UpdateEmployeeRequest>
{
    public UpdateEmployeeRequestValidator()
    {
        RuleFor(x => x.FirstName).ValidPersonName();
        RuleFor(x => x.LastName).ValidPersonName();
        RuleFor(x => x.Email).ValidWorkEmail();
        RuleFor(x => x.PhoneNumber).ValidPhone();
        RuleFor(x => x.DepartmentId).GreaterThan(0);
        RuleFor(x => x.ManagerId).GreaterThan(0).When(x => x.ManagerId is not null);
        RuleFor(x => x.RowVersion).NotEmpty();
    }
}

public sealed class ChangeEmployeeStatusRequestValidator : AbstractValidator<ChangeEmployeeStatusRequest>
{
    public ChangeEmployeeStatusRequestValidator()
    {
        RuleFor(x => x.Status)
            .NotEmpty()
            .Must(EmployeeRules.IsValidStatus)
            .WithMessage($"Status must be one of: {string.Join(", ", EmployeeRules.StatusNames)}.");

        // A termination needs a date. Other statuses must not send one.
        RuleFor(x => x.TerminationDate)
            .NotNull()
            .When(x => string.Equals(x.Status, nameof(EmployeeStatus.Terminated), StringComparison.OrdinalIgnoreCase))
            .WithMessage("TerminationDate is required when Status is Terminated.");

        RuleFor(x => x.RowVersion).NotEmpty();
    }
}

public sealed class EmployeeListQueryValidator : AbstractValidator<EmployeeListQuery>
{
    // The ONLY columns clients may sort by (design rule: sorting allow-list).
    // Accepting any column name from the URL would let clients sort on
    // un-indexed or sensitive columns.
    public static readonly string[] SortableColumns =
        ["lastName", "firstName", "employeeNumber", "hireDate", "createdAt"];

    public EmployeeListQueryValidator()
    {
        RuleFor(x => x.Page).GreaterThanOrEqualTo(1);

        // Cap page size so one request can't pull the whole table.
        RuleFor(x => x.PageSize).InclusiveBetween(1, 100);

        RuleFor(x => x.Search).MaximumLength(100);

        RuleFor(x => x.Status)
            .Must(EmployeeRules.IsValidStatus)
            .When(x => !string.IsNullOrWhiteSpace(x.Status))
            .WithMessage($"Status must be one of: {string.Join(", ", EmployeeRules.StatusNames)}.");

        RuleFor(x => x.SortBy)
            .Must(s => SortableColumns.Contains(s, StringComparer.OrdinalIgnoreCase))
            .WithMessage($"SortBy must be one of: {string.Join(", ", SortableColumns)}.");

        RuleFor(x => x.SortDirection)
            .Must(d => d is not null && (d.Equals("asc", StringComparison.OrdinalIgnoreCase)
                                      || d.Equals("desc", StringComparison.OrdinalIgnoreCase)))
            .WithMessage("SortDirection must be 'asc' or 'desc'.");
    }
}
