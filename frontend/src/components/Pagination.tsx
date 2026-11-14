// =============================================================================
// Pagination.tsx: reusable "Previous / Page X of Y / Next" control
// =============================================================================
//
// A "presentational" component: it holds no state and fetches no data. It
// shows what it's given (props) and reports clicks through a callback
// (`onPageChange`). The PARENT owns the page number. That makes it reusable
// for any paged list (employees, leave requests, audit logs...).
//
// No "use client" needed here: it becomes part of the client bundle
// automatically because it's imported by a Client Component (EmployeeList).
// -----------------------------------------------------------------------------

type PaginationProps = {
  page: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  // Disable the buttons while a page is loading, so clicks don't pile up.
  disabled?: boolean;
};

export default function Pagination({
  page,
  totalPages,
  totalCount,
  pageSize,
  onPageChange,
  disabled = false,
}: PaginationProps) {
  // "Showing 21-40 of 135". Math.min caps the last page's upper number.
  const first = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, totalCount);

  const buttonClass =
    "rounded border border-zinc-300 px-3 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700";

  return (
    // <nav> + aria-label tell screen readers this is pagination navigation.
    <nav aria-label="Pagination" className="flex items-center justify-between gap-4 text-sm">
      <p className="text-zinc-600 dark:text-zinc-400">
        Showing {first}-{last} of {totalCount}
      </p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          className={buttonClass}
          onClick={() => onPageChange(page - 1)}
          disabled={disabled || page <= 1}
        >
          Previous
        </button>

        <span>
          Page {totalPages === 0 ? 0 : page} of {totalPages}
        </span>

        <button
          type="button"
          className={buttonClass}
          onClick={() => onPageChange(page + 1)}
          disabled={disabled || page >= totalPages}
        >
          Next
        </button>
      </div>
    </nav>
  );
}
