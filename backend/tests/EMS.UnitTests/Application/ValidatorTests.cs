// =============================================================================
// ValidatorTests.cs: unit tests for the FluentValidation request validators
// =============================================================================
//
// Validators are plain classes, so they can be tested without a web server or
// database: create the validator, call Validate(request), inspect the result.
// -----------------------------------------------------------------------------

using EMS.Application.Departments;
using EMS.Application.Employees;
using EMS.Contracts.Departments;
using EMS.Contracts.Employees;

namespace EMS.UnitTests.Application;

public class ValidatorTests
{
    [Theory]
    [InlineData("ENG")]
    [InlineData(" eng ")]      // surrounding spaces are trimmed later, so allowed
    [InlineData("OPS-2_A")]
    public void CreateDepartment_AcceptsValidCodes(string code)
    {
        var result = new CreateDepartmentRequestValidator()
            .Validate(new CreateDepartmentRequest(code, "Engineering", null));

        Assert.True(result.IsValid);
    }

    [Theory]
    [InlineData("")]
    [InlineData("has space")]
    [InlineData("bad!")]
    public void CreateDepartment_RejectsInvalidCodes(string code)
    {
        var result = new CreateDepartmentRequestValidator()
            .Validate(new CreateDepartmentRequest(code, "Engineering", null));

        Assert.False(result.IsValid);
        // The error is reported against the "Code" field, which the frontend
        // uses to show the message next to the right input.
        Assert.Contains(result.Errors, e => e.PropertyName == nameof(CreateDepartmentRequest.Code));
    }

    [Fact]
    public void EmployeeListQuery_RejectsColumnsOutsideTheSortAllowList()
    {
        var result = new EmployeeListQueryValidator()
            .Validate(new EmployeeListQuery { SortBy = "salary" });

        Assert.False(result.IsValid);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(101)]
    public void EmployeeListQuery_RejectsPageSizeOutOfRange(int pageSize)
    {
        var result = new EmployeeListQueryValidator()
            .Validate(new EmployeeListQuery { PageSize = pageSize });

        Assert.False(result.IsValid);
    }

    [Fact]
    public void ChangeStatus_ToTerminated_RequiresTerminationDate()
    {
        var result = new ChangeEmployeeStatusRequestValidator()
            .Validate(new ChangeEmployeeStatusRequest("Terminated", TerminationDate: null, RowVersion: [1]));

        Assert.Contains(result.Errors, e => e.PropertyName == nameof(ChangeEmployeeStatusRequest.TerminationDate));
    }

    [Fact]
    public void ChangeStatus_RejectsUnknownStatus()
    {
        var result = new ChangeEmployeeStatusRequestValidator()
            .Validate(new ChangeEmployeeStatusRequest("Retired", null, [1]));

        Assert.Contains(result.Errors, e => e.PropertyName == nameof(ChangeEmployeeStatusRequest.Status));
    }
}
