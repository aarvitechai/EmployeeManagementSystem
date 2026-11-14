// =============================================================================
// DepartmentForm.tsx: one form for creating AND editing a department
// =============================================================================
//
// Same approach as features/employees/EmployeeForm.tsx (read that file's
// header for the full submit flow): React Hook Form + Zod for instant
// checks, RTK Query mutations for saving, backend field errors placed next to
// the matching inputs, and other errors (409 duplicate / concurrency) shown
// in a banner.
//
// Create mode: code, name, description.
// Edit mode:   code is read-only (fixed after creation), plus an Active checkbox.
// -----------------------------------------------------------------------------

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import FormField, { errorId, inputClassName } from "@/components/FormField";
import { getErrorMessage, getFieldErrors } from "@/services/apiErrors";
import type { Department } from "@/types/api";
import { departmentFormSchema, emptyDepartmentForm, type DepartmentFormValues } from "@/validators/departmentSchema";

import { useCreateDepartmentMutation, useUpdateDepartmentMutation } from "./departmentsApi";

export default function DepartmentForm({ department }: { department?: Department }) {
  const isEdit = department !== undefined;
  const router = useRouter();

  const {
    register,
    handleSubmit,
    setError,
    reset,
    // `control` connects helper hooks such as useWatch to this form.
    control,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<DepartmentFormValues>({
    resolver: zodResolver(departmentFormSchema),
    defaultValues: isEdit
      ? {
          code: department.code,
          name: department.name,
          description: department.description ?? "",
          isActive: department.isActive,
        }
      : emptyDepartmentForm,
    mode: "onTouched",
  });

  const [formError, setFormError] = useState<string | null>(null);

  const [createDepartment] = useCreateDepartmentMutation();
  const [updateDepartment] = useUpdateDepartmentMutation();

  // Warn when DEACTIVATING a department that still has employees: they stay
  // assigned, but the backend won't accept new employees in it.
  // useWatch re-renders when the checkbox changes, so the warning appears as
  // soon as it's unticked. (Preferred over RHF's `watch()`, which the React
  // Compiler can't optimise safely.)
  const isActive = useWatch({ control, name: "isActive" });
  const showDeactivateWarning = isEdit && department.isActive && !isActive && department.employeeCount > 0;

  async function onSubmit(values: DepartmentFormValues) {
    setFormError(null);
    const description = values.description || null;

    try {
      if (isEdit) {
        await updateDepartment({
          id: department.id,
          name: values.name,
          description,
          isActive: values.isActive,
          rowVersion: department.rowVersion,
        }).unwrap();
      } else {
        await createDepartment({ code: values.code, name: values.name, description }).unwrap();
      }
      router.push("/departments");
    } catch (error) {
      const fieldErrors = getFieldErrors(error);
      if (fieldErrors) {
        const leftovers: string[] = [];
        for (const [field, message] of Object.entries(fieldErrors)) {
          if (field in emptyDepartmentForm) {
            setError(field as keyof DepartmentFormValues, { type: "server", message });
          } else {
            leftovers.push(message);
          }
        }
        setFormError(leftovers.length ? leftovers.join(" ") : "Please fix the highlighted fields.");
        return;
      }
      setFormError(getErrorMessage(error));
    }
  }

  function fieldProps(name: "code" | "name" | "description") {
    return {
      id: name,
      ...register(name),
      "aria-invalid": errors[name] ? true : undefined,
      "aria-describedby": errors[name] ? errorId(name) : undefined,
      className: inputClassName,
    };
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex max-w-2xl flex-col gap-6">
      {formError && (
        <div
          role="alert"
          className="rounded border border-red-300 bg-red-50 p-4 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300"
        >
          {formError}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[10rem_1fr]">
        <FormField
          id="code"
          label="Code"
          required
          error={errors.code?.message}
          hint={isEdit ? "Cannot be changed." : "e.g. ENG"}
        >
          {/* uppercase is visual only; the backend stores codes upper-case anyway. */}
          <input {...fieldProps("code")} readOnly={isEdit} autoComplete="off" style={{ textTransform: "uppercase" }} />
        </FormField>

        <FormField id="name" label="Name" required error={errors.name?.message}>
          <input {...fieldProps("name")} autoComplete="off" />
        </FormField>
      </div>

      <FormField id="description" label="Description" error={errors.description?.message}>
        <textarea {...fieldProps("description")} rows={3} />
      </FormField>

      {isEdit && (
        <div className="flex flex-col gap-2">
          <label htmlFor="isActive" className="flex items-center gap-2 text-sm">
            <input id="isActive" type="checkbox" {...register("isActive")} className="h-4 w-4" />
            Active
          </label>
          {showDeactivateWarning && (
            <p role="status" className="text-sm text-amber-700 dark:text-amber-400">
              {department.employeeCount} employee{department.employeeCount === 1 ? " is" : "s are"} still in
              this department. They stay assigned, but no new employees can be added while it is inactive.
            </p>
          )}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-black"
        >
          {isSubmitting ? "Saving..." : isEdit ? "Save changes" : "Create department"}
        </button>
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
        <Link href="/departments" className="text-sm hover:underline">
          Cancel
        </Link>
      </div>
    </form>
  );
}
