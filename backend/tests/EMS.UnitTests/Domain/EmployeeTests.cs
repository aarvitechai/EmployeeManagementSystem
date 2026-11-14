// =============================================================================
// EmployeeTests.cs: unit tests for the Employee domain rules
// =============================================================================
//
// Unit tests check one small piece of logic in isolation: no database, no
// web server. They run in milliseconds, so run them often: `dotnet test`.
//
// xUnit basics:
//   [Fact]          = one test with no parameters.
//   [Theory] + [InlineData(...)] = the same test run with several inputs.
//   Assert.*        = fails the test if the condition is not true.
//
// Each test follows Arrange (set up) -> Act (do the thing) -> Assert (check).
// -----------------------------------------------------------------------------

using EMS.Domain.Employees;

namespace EMS.UnitTests.Domain;

public class EmployeeTests
{
    // Helper that builds a valid employee so each test only states what's special.
    private static Employee CreateEmployee(DateOnly? hireDate = null) =>
        new(
            employeeNumber: " emp-0001 ",
            firstName: "  Asha ",
            lastName: "Verma",
            email: "Asha.Verma@Example.com",
            hireDate: hireDate ?? new DateOnly(2026, 1, 15),
            departmentId: 1);

    [Fact]
    public void Constructor_NormalizesInput_AndStartsActive()
    {
        // Act
        var employee = CreateEmployee();

        // Assert: values are trimmed / normalised by the domain.
        Assert.Equal("EMP-0001", employee.EmployeeNumber);
        Assert.Equal("Asha", employee.FirstName);
        Assert.Equal("asha.verma@example.com", employee.Email);
        Assert.Equal("Asha Verma", employee.FullName);
        Assert.Equal(EmployeeStatus.Active, employee.Status);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void Constructor_RejectsBlankFirstName(string firstName)
    {
        // Assert.Throws checks that the code inside the lambda throws.
        Assert.Throws<ArgumentException>(() =>
            new Employee("EMP-1", firstName, "Verma", "a@example.com", new DateOnly(2026, 1, 1), 1));
    }

    [Fact]
    public void Constructor_RejectsInvalidDepartmentId()
    {
        Assert.Throws<ArgumentOutOfRangeException>(() =>
            new Employee("EMP-1", "Asha", "Verma", "a@example.com", new DateOnly(2026, 1, 1), departmentId: 0));
    }

    [Fact]
    public void Terminate_BeforeHireDate_Throws()
    {
        // Arrange
        var employee = CreateEmployee(hireDate: new DateOnly(2026, 3, 1));

        // Act + Assert: termination one day before hiring is invalid.
        Assert.Throws<ArgumentException>(() => employee.Terminate(new DateOnly(2026, 2, 28)));
    }

    [Fact]
    public void Terminate_SetsDateAndStatus()
    {
        var employee = CreateEmployee(hireDate: new DateOnly(2026, 3, 1));

        employee.Terminate(new DateOnly(2026, 12, 31));

        Assert.Equal(EmployeeStatus.Terminated, employee.Status);
        Assert.Equal(new DateOnly(2026, 12, 31), employee.TerminationDate);
    }

    [Fact]
    public void TerminatedEmployee_CannotChangeStatus()
    {
        var employee = CreateEmployee();
        employee.Terminate(new DateOnly(2026, 6, 30));

        Assert.Throws<InvalidOperationException>(() => employee.MarkActive());
    }
}
