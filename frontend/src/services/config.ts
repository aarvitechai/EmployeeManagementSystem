// The frontend talks to the backend only over HTTP. Its location is configured
// per environment via NEXT_PUBLIC_API_BASE_URL (see .env.example).
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5131";
