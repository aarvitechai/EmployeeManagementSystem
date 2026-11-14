// =============================================================================
// employeeSchema.ts: client-side validation rules for the employee form (Zod)
// =============================================================================
//
// Zod describes the SHAPE and RULES of data in one place:
//   z.string().trim().min(1, "Required")
// and can then check a value: schema.safeParse(value).
//
// React Hook Form uses this schema (through zodResolver) to validate the form
// BEFORE anything is sent, so users get instant feedback next to each field.
//
// IMPORTANT (design rule): this is for user experience only. The backend
// validates everything again (FluentValidation + domain rules), because a
// browser can be bypassed. These limits mirror the backend's on purpose.
// -----------------------------------------------------------------------------

import { z } from "zod";

// Same limits as backend EMS.Domain.Employees.Employee constants.
const EMPLOYEE_NUMBER_MAX = 20;
const NAME_MAX = 100;
const EMAIL_MAX = 256;
const PHONE_MAX = 20;

export const employeeFormSchema = z.object({
  employeeNumber: z
    .string()
    // .trim() removes surrounding spaces BEFORE the other checks run.
    .trim()
    .min(1, "Employee number is required.")
    .max(EMPLOYEE_NUMBER_MAX, `At most ${EMPLOYEE_NUMBER_MAX} characters.`)
    // Regular expression: letters, digits, "-" and "_" only.
    .regex(/^[A-Za-z0-9_-]+$/, "Use only letters, digits, '-' and '_'."),

  firstName: z.string().trim().min(1, "First name is required.").max(NAME_MAX, `At most ${NAME_MAX} characters.`),

  lastName: z.string().trim().min(1, "Last name is required.").max(NAME_MAX, `At most ${NAME_MAX} characters.`),

  email: z
    .string()
    .trim()
    .min(1, "Email is required.")
    .max(EMAIL_MAX, `At most ${EMAIL_MAX} characters.`)
    // .pipe() passes the trimmed string on to Zod's built-in email check.
    .pipe(z.email("Enter a valid email address.")),

  // Optional: an empty string means "no phone number".
  phoneNumber: z
    .string()
    .trim()
    .max(PHONE_MAX, `At most ${PHONE_MAX} characters.`)
    .regex(/^[0-9+\-() ]*$/, "Use only digits, spaces and + - ( )."),

  // <input type="date"> gives "yyyy-MM-dd", or "" when empty.
  hireDate: z.string().min(1, "Hire date is required."),

  // <select> values are always strings, so ids are kept as strings in the
  // form ("" = nothing chosen) and converted to numbers when submitting.
  departmentId: z.string().min(1, "Select a department."),
  managerId: z.string(),
});

// z.infer creates the TypeScript type FROM the schema, so the type and the
// rules can never drift apart:
// { employeeNumber: string; firstName: string; ...; managerId: string }
export type EmployeeFormValues = z.infer<typeof employeeFormSchema>;

// Starting values for the "new employee" form.
export const emptyEmployeeForm: EmployeeFormValues = {
  employeeNumber: "",
  firstName: "",
  lastName: "",
  email: "",
  phoneNumber: "",
  hireDate: "",
  departmentId: "",
  managerId: "",
};
