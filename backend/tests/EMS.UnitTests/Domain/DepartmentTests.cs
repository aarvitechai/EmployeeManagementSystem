// =============================================================================
// DepartmentTests.cs: unit tests for the Department domain rules
// =============================================================================
// See EmployeeTests.cs for an explanation of [Fact], [Theory] and Assert.
// -----------------------------------------------------------------------------

using EMS.Domain.Common;
using EMS.Domain.Departments;

namespace EMS.UnitTests.Domain;

public class DepartmentTests
{
    [Fact]
    public void Constructor_UppercasesCode_AndStartsActive()
    {
        var department = new Department(" eng ", "Engineering", "  ");

        Assert.Equal("ENG", department.Code);
        Assert.Equal("Engineering", department.Name);
        Assert.Null(department.Description);   // blank description -> null
        Assert.True(department.IsActive);
    }

    [Fact]
    public void Constructor_RejectsCodeLongerThanMax()
    {
        // new string('X', 11) = "XXXXXXXXXXX", one character over the limit.
        var tooLong = new string('X', Department.CodeMaxLength + 1);

        Assert.Throws<DomainException>(() => new Department(tooLong, "Engineering"));
    }

    [Fact]
    public void Deactivate_ThenActivate_TogglesIsActive()
    {
        var department = new Department("HR", "Human Resources");

        department.Deactivate();
        Assert.False(department.IsActive);

        department.Activate();
        Assert.True(department.IsActive);
    }

    [Fact]
    public void MarkDeleted_EmptyDepartment_SoftDeletesAndDeactivates()
    {
        var department = new Department("OPS", "Operations");

        department.MarkDeleted(hasEmployees: false);

        Assert.True(department.IsDeleted);
        Assert.False(department.IsActive);
    }

    [Fact]
    public void MarkDeleted_WithEmployees_Throws()
    {
        var department = new Department("OPS", "Operations");

        Assert.Throws<DomainException>(() => department.MarkDeleted(hasEmployees: true));
        Assert.False(department.IsDeleted);
    }

    [Fact]
    public void Activate_DeletedDepartment_Throws()
    {
        var department = new Department("OPS", "Operations");
        department.MarkDeleted(hasEmployees: false);

        Assert.Throws<DomainException>(() => department.Activate());
    }
}
