// =============================================================================
// departmentSchema.ts: client-side validation rules for the department form
// =============================================================================
// See employeeSchema.ts for how Zod works with React Hook Form. These limits
// mirror backend EMS.Domain.Departments.Department; the backend re-checks all.
// -----------------------------------------------------------------------------

import { z } from "zod";

const CODE_MAX = 10;
const NAME_MAX = 100;
const DESCRIPTION_MAX = 500;

export const departmentFormSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "Code is required.")
    .max(CODE_MAX, `At most ${CODE_MAX} characters.`)
    .regex(/^[A-Za-z0-9_-]+$/, "Use only letters, digits, '-' and '_'."),

  name: z.string().trim().min(1, "Name is required.").max(NAME_MAX, `At most ${NAME_MAX} characters.`),

  // Optional free text; "" is sent as null.
  description: z.string().trim().max(DESCRIPTION_MAX, `At most ${DESCRIPTION_MAX} characters.`),

  // A checkbox registered with React Hook Form gives a real boolean.
  isActive: z.boolean(),
});

export type DepartmentFormValues = z.infer<typeof departmentFormSchema>;

export const emptyDepartmentForm: DepartmentFormValues = {
  code: "",
  name: "",
  description: "",
  isActive: true,
};
