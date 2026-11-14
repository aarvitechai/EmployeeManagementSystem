// =============================================================================
// api.ts (types): TypeScript shapes of the JSON the backend sends and accepts
// =============================================================================
//
// These mirror the C# records in backend/src/EMS.Contracts. TypeScript types
// exist only at compile time: they give autocomplete and catch typos like
// `employee.fullname`, but they do NOT check the real JSON at runtime. If the
// backend contract changes, update these types to match.
//
// JSON notes:
//   - C# `PascalCase` properties arrive as `camelCase` (ASP.NET Core default).
//   - C# DateOnly arrives as a "yyyy-MM-dd" string, DateTime as an ISO string.
//   - C# byte[] (rowVersion) arrives as a Base64 string.
//   - C# `string?` / `int?` arrive as `null` when empty.
// -----------------------------------------------------------------------------

// ---- Shared -----------------------------------------------------------------

// Matches EMS.Contracts.Common.PagedResponse<T>. `<T>` = generic type
// parameter: PagedResponse<Employee> is a page of employees.
export type PagedResponse<T> = {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
};

// RFC 9457 Problem Details: the shape of EVERY error the API returns
// (see backend GlobalExceptionHandler). `?` = the property may be missing.
export type ProblemDetails = {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  traceId?: string;
  // Only on 400 validation errors: field name -> list of messages,
  // e.g. { "Email": ["'Email' is not a valid email address."] }.
  // `Record<string, string[]>` = an object with string keys and string[] values.
  errors?: Record<string, string[]>;
};

// ---- Departments ------------------------------------------------------------

export type Department = {
  id: number;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  employeeCount: number;
  createdAtUtc: string;
  updatedAtUtc: string | null;
  rowVersion: string;
};

// ---- Employees --------------------------------------------------------------

// A "union of string literals": the value can ONLY be one of these three.
// TypeScript reports an error for `status === "active"` (wrong case).
export type EmployeeStatus = "Active" | "OnLeave" | "Terminated";

export const EMPLOYEE_STATUSES: EmployeeStatus[] = ["Active", "OnLeave", "Terminated"];

export type Employee = {
  id: number;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phoneNumber: string | null;
  hireDate: string;
  terminationDate: string | null;
  status: EmployeeStatus;
  departmentId: number;
  departmentName: string;
  managerId: number | null;
  managerName: string | null;
  createdAtUtc: string;
  updatedAtUtc: string | null;
  rowVersion: string;
};

// Body of POST /api/v1/employees (EMS.Contracts CreateEmployeeRequest).
export type CreateEmployeeRequest = {
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string | null;
  hireDate: string; // "yyyy-MM-dd"
  departmentId: number;
  managerId: number | null;
};

// Body of PUT /api/v1/employees/{id}. EmployeeNumber and HireDate can't be
// changed after creation. `rowVersion` must be the value from the last GET
// (optimistic concurrency: the API answers 409 if someone saved in between).
export type UpdateEmployeeRequest = {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string | null;
  departmentId: number;
  managerId: number | null;
  rowVersion: string;
};

// Body of PATCH /api/v1/employees/{id}/status.
// terminationDate is required when status is "Terminated", otherwise null.
export type ChangeEmployeeStatusRequest = {
  status: EmployeeStatus;
  terminationDate: string | null; // "yyyy-MM-dd"
  rowVersion: string;
};

// Columns the backend allows sorting by (its sort allow-list).
export type EmployeeSortBy = "lastName" | "firstName" | "employeeNumber" | "hireDate" | "createdAt";
export type SortDirection = "asc" | "desc";

// Query-string parameters for GET /api/v1/employees. All optional, and the
// backend applies defaults (page 1, 20 per page, sorted by last name).
export type EmployeeListParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  departmentId?: number;
  managerId?: number;
  status?: EmployeeStatus;
  sortBy?: EmployeeSortBy;
  sortDirection?: SortDirection;
};
