// =============================================================================
// DepartmentValidators.cs: input validation rules for department requests
// =============================================================================
//
// FluentValidation lets us describe rules in readable C#:
//   RuleFor(x => x.Name).NotEmpty().MaximumLength(100);
//
// Validation happens in TWO places on purpose:
//   1. Here (Application): checks the REQUEST and returns ALL problems at
//      once as a friendly 400 response listing every invalid field.
//   2. In the Domain entity (Guard): a last line of defence, so invalid data
//      can't be created even by code that skips these validators.
//
// The max lengths come from the Domain constants, so the API limits, the
// entity rules and the database column sizes always agree.
//
// These classes are registered automatically by AddValidatorsFromAssembly
// (see EMS.Application/DependencyInjection.cs).
// -----------------------------------------------------------------------------

using EMS.Contracts.Departments;
using EMS.Domain.Departments;
using FluentValidation;

namespace EMS.Application.Departments;

public sealed class CreateDepartmentRequestValidator : AbstractValidator<CreateDepartmentRequest>
{
    public CreateDepartmentRequestValidator()
    {
        RuleFor(x => x.Code)
            .NotEmpty()
            .MaximumLength(Department.CodeMaxLength)
            // Regular expression: letters, digits, "-" and "_" only. `\s*` at
            // both ends tolerates surrounding spaces, which the entity trims
            // off anyway (" eng " is stored as "ENG").
            .Matches(@"^\s*[A-Za-z0-9_-]+\s*$")
            .WithMessage("Code may contain only letters, digits, '-' and '_'.");

        RuleFor(x => x.Name).NotEmpty().MaximumLength(Department.NameMaxLength);

        RuleFor(x => x.Description).MaximumLength(Department.DescriptionMaxLength);
    }
}

public sealed class UpdateDepartmentRequestValidator : AbstractValidator<UpdateDepartmentRequest>
{
    public UpdateDepartmentRequestValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(Department.NameMaxLength);

        RuleFor(x => x.Description).MaximumLength(Department.DescriptionMaxLength);

        // Without the version the client saw, we can't detect conflicting edits.
        RuleFor(x => x.RowVersion)
            .NotEmpty()
            .WithMessage("RowVersion is required. Send back the value from the last GET.");
    }
}
