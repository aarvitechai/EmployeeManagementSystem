// =============================================================================
// AddEmployeeIsDeleted: soft-delete flag for employees
// =============================================================================
//
// Same pattern as AddDepartmentIsDeleted:
//   1. Adds Employees.IsDeleted (bit NOT NULL DEFAULT 0). Existing employees
//      get 0, so nobody is deleted by this migration.
//   2. Re-creates the unique indexes on EmployeeNumber and Email as FILTERED
//      indexes (WHERE [IsDeleted] = 0), so a deleted employee's number and
//      email can be reused while live employees stay unique.
//
// Down() reverses it. It would fail if a deleted and a live employee then
// share an employee number or email.
// -----------------------------------------------------------------------------

using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EMS.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddEmployeeIsDeleted : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Employees_Email",
                table: "Employees");

            migrationBuilder.DropIndex(
                name: "IX_Employees_EmployeeNumber",
                table: "Employees");

            migrationBuilder.AddColumn<bool>(
                name: "IsDeleted",
                table: "Employees",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateIndex(
                name: "IX_Employees_Email",
                table: "Employees",
                column: "Email",
                unique: true,
                filter: "[IsDeleted] = 0");

            migrationBuilder.CreateIndex(
                name: "IX_Employees_EmployeeNumber",
                table: "Employees",
                column: "EmployeeNumber",
                unique: true,
                filter: "[IsDeleted] = 0");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Employees_Email",
                table: "Employees");

            migrationBuilder.DropIndex(
                name: "IX_Employees_EmployeeNumber",
                table: "Employees");

            migrationBuilder.DropColumn(
                name: "IsDeleted",
                table: "Employees");

            migrationBuilder.CreateIndex(
                name: "IX_Employees_Email",
                table: "Employees",
                column: "Email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Employees_EmployeeNumber",
                table: "Employees",
                column: "EmployeeNumber",
                unique: true);
        }
    }
}
