// =============================================================================
// loginSchema.ts: client-side validation for the login form (Zod)
// =============================================================================
// Only checks that the fields are filled in. Password RULES are not checked
// here: that's the backend's job when accounts are created, and repeating them
// on a login form would just give attackers hints.
// -----------------------------------------------------------------------------

import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().min(1, "Email is required.").pipe(z.email("Enter a valid email address.")),
  password: z.string().min(1, "Password is required."),
  rememberMe: z.boolean(),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
