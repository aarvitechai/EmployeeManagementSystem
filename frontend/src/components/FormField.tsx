// =============================================================================
// FormField.tsx: label + input + error message, laid out consistently
// =============================================================================
//
// Every form field needs the same three things: a visible label, the input
// itself, and an error message. This wrapper keeps them consistent and
// accessible:
//   - `htmlFor` links the <label> to the input (clicking the label focuses it,
//     screen readers read the label when the input is focused);
//   - the error has an id the input can reference with aria-describedby, so
//     screen readers also read the error.
//
// The input is passed as `children`, so this works for <input>, <select>, etc.
// -----------------------------------------------------------------------------

type FormFieldProps = {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
};

// Shared input styling. Exported so forms use one look everywhere.
// `aria-[invalid=true]:` is a Tailwind variant: red border when invalid.
export const inputClassName =
  "w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm read-only:bg-zinc-100 read-only:text-zinc-500 aria-[invalid=true]:border-red-500 dark:border-zinc-700 dark:bg-zinc-900 dark:read-only:bg-zinc-800";

// Builds the id used for a field's error message.
export const errorId = (id: string) => `${id}-error`;

export default function FormField({ id, label, error, hint, required, children }: FormFieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
        {/* The asterisk is visual only; the input itself carries `required`. */}
        {required && <span aria-hidden="true" className="text-red-600"> *</span>}
      </label>

      {children}

      {hint && !error && <p className="text-xs text-zinc-500">{hint}</p>}

      {/* Only rendered when there's an error. */}
      {error && (
        <p id={errorId(id)} className="text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
