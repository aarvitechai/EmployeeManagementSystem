// =============================================================================
// LoginForm.tsx: email + password form that logs the user in
// =============================================================================
//
// Flow:
//   1. React Hook Form + Zod check the fields are filled in.
//   2. useLoginMutation POSTs to /api/v1/auth/login. On success the API sets
//      the HttpOnly login cookie (we never touch it) and returns the user.
//   3. We go to `returnUrl`, the page the user originally asked for (set by
//      AuthGuard), or the home page.
//
// Error messages: 401 wrong email/password or account locked, 429 too many
// attempts, or "cannot reach the server" when the API is down.
// -----------------------------------------------------------------------------

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import FormField, { errorId, inputClassName } from "@/components/FormField";
import { getErrorMessage } from "@/services/apiErrors";
import { loginSchema, type LoginFormValues } from "@/validators/loginSchema";

import { useGetCurrentUserQuery, useLoginMutation } from "./authApi";

// SECURITY: only follow returnUrl if it's a path on OUR site. Without this
// check, a link like /login?returnUrl=https://evil.example would send users
// to another site right after they log in (an "open redirect").
function safeReturnUrl(value: string | null): string {
  if (value && value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/login")) {
    return value;
  }
  return "/";
}

export default function LoginForm() {
  const router = useRouter();
  // Reads ?returnUrl=... from the current URL.
  const searchParams = useSearchParams();
  const returnUrl = safeReturnUrl(searchParams.get("returnUrl"));

  const [login] = useLoginMutation();
  const [formError, setFormError] = useState<string | null>(null);

  // Already logged in? (e.g. someone opens /login in a new tab) Skip the form.
  // Uses `currentData` (what the cache holds NOW), never `data`: `data` can
  // still contain the user from before a logout or expired session, which
  // would bounce a logged-out user away from this page (see AuthGuard.tsx).
  const { currentData: currentUser, isError: sessionCheckFailed, isFetching } = useGetCurrentUserQuery();
  const alreadyLoggedIn = !!currentUser && !sessionCheckFailed && !isFetching;
  useEffect(() => {
    if (alreadyLoggedIn) router.replace(returnUrl);
  }, [alreadyLoggedIn, returnUrl, router]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", rememberMe: false },
  });

  async function onSubmit(values: LoginFormValues) {
    setFormError(null);
    try {
      await login(values).unwrap();
      router.replace(returnUrl);
    } catch (error) {
      setFormError(getErrorMessage(error));
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex w-full max-w-sm flex-col gap-4">
      {formError && (
        <div
          role="alert"
          className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300"
        >
          {formError}
        </div>
      )}

      <FormField id="email" label="Email" required error={errors.email?.message}>
        <input
          id="email"
          type="email"
          // autoComplete lets password managers fill the form correctly.
          autoComplete="username"
          // Focus the first field when the page opens.
          autoFocus
          {...register("email")}
          aria-invalid={errors.email ? true : undefined}
          aria-describedby={errors.email ? errorId("email") : undefined}
          className={inputClassName}
        />
      </FormField>

      <FormField id="password" label="Password" required error={errors.password?.message}>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          {...register("password")}
          aria-invalid={errors.password ? true : undefined}
          aria-describedby={errors.password ? errorId("password") : undefined}
          className={inputClassName}
        />
      </FormField>

      <label htmlFor="rememberMe" className="flex items-center gap-2 text-sm">
        <input id="rememberMe" type="checkbox" {...register("rememberMe")} className="h-4 w-4" />
        Keep me signed in
      </label>

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-black"
      >
        {isSubmitting ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
