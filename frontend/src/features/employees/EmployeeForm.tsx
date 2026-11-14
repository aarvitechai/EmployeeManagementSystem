// =============================================================================
// EmployeeForm.tsx: one form for BOTH creating and editing an employee
// =============================================================================
//
// Libraries:
//   - React Hook Form (RHF): tracks field values, touched state, errors and
//     submitting state WITHOUT re-rendering the whole form on every keystroke.
//   - Zod + zodResolver: RHF runs our schema (validators/employeeSchema.ts)
//     and puts any problems into `formState.errors`.
//   - RTK Query mutations: send the POST/PUT and invalidate cached lists.
//
// Submit flow:
//   1. user clicks Save -> RHF validates with Zod. If invalid, errors are shown
//      and NOTHING is sent.
//   2. valid -> onSubmit() converts form strings to the API's types and calls
//      the mutation. `.unwrap()` returns the result or THROWS the error.
//   3. success -> RTK Query invalidates the "Employee" tags (list refetches)
//      and we navigate back to the list.
//   4. failure -> backend field errors (400) go next to their inputs;
//      anything else (409 duplicate / concurrency, network) goes in a banner.
// -----------------------------------------------------------------------------

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import FormField, { errorId, inputClassName } from "@/components/FormField";
import { useGetDepartmentsQuery } from "@/features/departments/departmentsApi";
import { getErrorMessage, getFieldErrors } from "@/services/apiErrors";
import type { Employee } from "@/types/api";
import { emptyEmployeeForm, employeeFormSchema, type EmployeeFormValues } from "@/validators/employeeSchema";

import { useCreateEmployeeMutation, useGetEmployeesQuery, useUpdateEmployeeMutation } from "./employeesApi";

type EmployeeFormProps = {
  // Present = edit mode; missing = create mode.
  employee?: Employee;
  // Called whenever the form switches between "no changes" and "has unsaved
  // changes", so the parent can react (EditEmployee locks the status panel).
  onDirtyChange?: (isDirty: boolean) => void;
};

// Convert an existing employee (API shape) into form values (all strings).
function toFormValues(employee: Employee): EmployeeFormValues {
  return {
    employeeNumber: employee.employeeNumber,
    firstName: employee.firstName,
    lastName: employee.lastName,
    email: employee.email,
    phoneNumber: employee.phoneNumber ?? "",
    hireDate: employee.hireDate,
    departmentId: String(employee.departmentId),
    managerId: employee.managerId === null ? "" : String(employee.managerId),
  };
}

export default function EmployeeForm({ employee, onDirtyChange }: EmployeeFormProps) {
  const isEdit = employee !== undefined;
  const router = useRouter();

  // ---- Form state (React Hook Form) ----------------------------------------
  const {
    // register("firstName") returns { name, onChange, onBlur, ref } to spread
    // onto an <input>, connecting it to RHF.
    register,
    // Wraps our submit function: validates first, calls ours only if valid.
    handleSubmit,
    // Lets us attach SERVER errors to specific fields after submitting.
    setError,
    // Puts every field back to its default values (used by "Discard changes").
    reset,
    // isDirty = at least one field differs from its default value.
    formState: { errors, isSubmitting, isDirty },
  } = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: isEdit ? toFormValues(employee) : emptyEmployeeForm,
    // Validate a field when it loses focus, then re-check on every change once
    // it has an error, so feedback is quick but not shouty while typing.
    mode: "onTouched",
  });

  // Tell the parent when the dirty state changes. useEffect runs AFTER render,
  // and only when `isDirty` (or the callback) actually changes.
  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  // A message for errors that don't belong to one field (409, network...).
  const [formError, setFormError] = useState<string | null>(null);

  // ---- Data for the drop-downs ---------------------------------------------
  const { data: departments, isLoading: departmentsLoading } = useGetDepartmentsQuery({ includeInactive: true });

  // Possible managers: active employees. pageSize 100 is the API's maximum;
  // fine for now, but a large company will need a searchable picker.
  const { data: managerPage } = useGetEmployeesQuery({
    pageSize: 100,
    status: "Active",
    sortBy: "lastName",
  });

  // Only ACTIVE departments can receive employees, but when editing we also
  // keep the employee's current department in the list even if it has since
  // been deactivated, so the form can still show it.
  const departmentOptions = (departments ?? []).filter(
    (d) => d.isActive || d.id === employee?.departmentId,
  );

  // An employee can't be their own manager, so leave them out.
  const managerOptions = (managerPage?.items ?? []).filter((m) => m.id !== employee?.id);

  // ---- Mutations -----------------------------------------------------------
  // Each mutation hook returns [triggerFunction, { isLoading, error, ... }].
  const [createEmployee] = useCreateEmployeeMutation();
  const [updateEmployee] = useUpdateEmployeeMutation();

  async function onSubmit(values: EmployeeFormValues) {
    setFormError(null);

    // Form strings -> API types. Empty optional strings become null.
    const common = {
      firstName: values.firstName,
      lastName: values.lastName,
      email: values.email,
      phoneNumber: values.phoneNumber || null,
      departmentId: Number(values.departmentId),
      managerId: values.managerId ? Number(values.managerId) : null,
    };

    try {
      if (isEdit) {
        await updateEmployee({
          id: employee.id,
          ...common,
          // Send back the version we loaded. If someone saved in between, the
          // API answers 409 instead of overwriting their changes.
          rowVersion: employee.rowVersion,
        }).unwrap();
      } else {
        await createEmployee({
          ...common,
          employeeNumber: values.employeeNumber,
          hireDate: values.hireDate,
        }).unwrap();
      }

      // Success: back to the list (which refetches because its tag was invalidated).
      router.push("/employees");
    } catch (error) {
      // 400 with per-field messages: show each one next to its input.
      const fieldErrors = getFieldErrors(error);
      if (fieldErrors) {
        const leftovers: string[] = [];
        for (const [field, message] of Object.entries(fieldErrors)) {
          if (field in emptyEmployeeForm) {
            setError(field as keyof EmployeeFormValues, { type: "server", message });
          } else {
            leftovers.push(message); // e.g. "RowVersion" has no input
          }
        }
        setFormError(leftovers.length ? leftovers.join(" ") : "Please fix the highlighted fields.");
        return;
      }

      // Anything else: one message in the banner.
      setFormError(getErrorMessage(error));
    }
  }

  // Props shared by every input: connect RHF, mark invalid state for
  // styling + screen readers, and point at the error message.
  function fieldProps(name: keyof EmployeeFormValues) {
    return {
      id: name,
      ...register(name),
      "aria-invalid": errors[name] ? true : undefined,
      "aria-describedby": errors[name] ? errorId(name) : undefined,
      className: inputClassName,
    };
  }

  // ---- Render --------------------------------------------------------------
  return (
    // noValidate: turn off the browser's own validation bubbles; Zod handles it.
    // handleSubmit(onSubmit): validate first, then call onSubmit with values.
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex max-w-2xl flex-col gap-6">
      {formError && (
        <div
          role="alert"
          className="rounded border border-red-300 bg-red-50 p-4 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300"
        >
          {formError}
        </div>
      )}

      {/* A 1-column grid on phones, 2 columns from the `sm` breakpoint up. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField
          id="employeeNumber"
          label="Employee number"
          required
          error={errors.employeeNumber?.message}
          hint={isEdit ? "Cannot be changed after creation." : "e.g. EMP-0001"}
        >
          {/* readOnly (not disabled) in edit mode: disabled inputs are left out
              of the submitted values, and the schema expects every field. */}
          <input {...fieldProps("employeeNumber")} readOnly={isEdit} autoComplete="off" />
        </FormField>

        <FormField
          id="hireDate"
          label="Hire date"
          required
          error={errors.hireDate?.message}
          hint={isEdit ? "Cannot be changed after creation." : undefined}
        >
          <input {...fieldProps("hireDate")} type="date" readOnly={isEdit} />
        </FormField>

        <FormField id="firstName" label="First name" required error={errors.firstName?.message}>
          <input {...fieldProps("firstName")} autoComplete="given-name" />
        </FormField>

        <FormField id="lastName" label="Last name" required error={errors.lastName?.message}>
          <input {...fieldProps("lastName")} autoComplete="family-name" />
        </FormField>

        <FormField id="email" label="Work email" required error={errors.email?.message}>
          <input {...fieldProps("email")} type="email" autoComplete="email" />
        </FormField>

        <FormField id="phoneNumber" label="Phone number" error={errors.phoneNumber?.message}>
          <input {...fieldProps("phoneNumber")} type="tel" autoComplete="tel" />
        </FormField>

        <FormField id="departmentId" label="Department" required error={errors.departmentId?.message}>
          <select {...fieldProps("departmentId")} disabled={departmentsLoading}>
            <option value="">{departmentsLoading ? "Loading..." : "Select a department"}</option>
            {departmentOptions.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
                {d.isActive ? "" : " (inactive)"}
              </option>
            ))}
          </select>
        </FormField>

        <FormField id="managerId" label="Manager" error={errors.managerId?.message}>
          <select {...fieldProps("managerId")}>
            <option value="">No manager</option>
            {managerOptions.map((m) => (
              <option key={m.id} value={m.id}>
                {m.fullName} ({m.employeeNumber})
              </option>
            ))}
          </select>
        </FormField>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          // isSubmitting is true while onSubmit's Promise is running, which
          // prevents double-clicks from creating two employees.
          disabled={isSubmitting}
          className="rounded bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-black"
        >
          {isSubmitting ? "Saving..." : isEdit ? "Save changes" : "Create employee"}
        </button>
        {/* Only in edit mode, and only when something was changed. */}
        {isEdit && isDirty && (
          <button
            type="button"
            onClick={() => {
              reset();
              setFormError(null);
            }}
            disabled={isSubmitting}
            className="rounded border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700"
          >
            Discard changes
          </button>
        )}
        <Link href="/employees" className="text-sm hover:underline">
          Cancel
        </Link>
      </div>
    </form>
  );
}
