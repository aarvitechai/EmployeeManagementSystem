// =============================================================================
// DependencyInjection.cs: registers the Application layer's services
// =============================================================================
// Program.cs calls `builder.Services.AddApplication()`. See
// EMS.Infrastructure/DependencyInjection.cs for an explanation of DI.
// -----------------------------------------------------------------------------

using EMS.Application.Departments;
using EMS.Application.Employees;
using FluentValidation;
using Microsoft.Extensions.DependencyInjection;

namespace EMS.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        // AddScoped = one instance per HTTP request. Services use the scoped
        // DbContext, so they must be scoped too (never singleton).
        //
        // "When someone asks for IDepartmentService, give them a DepartmentService."
        services.AddScoped<IDepartmentService, DepartmentService>();
        services.AddScoped<IEmployeeService, EmployeeService>();

        // Finds every AbstractValidator<T> class in this project and registers
        // it as IValidator<T>, so services can simply ask for
        // IValidator<CreateEmployeeRequest> in their constructor.
        services.AddValidatorsFromAssembly(typeof(DependencyInjection).Assembly, includeInternalTypes: true);

        return services;
    }
}
