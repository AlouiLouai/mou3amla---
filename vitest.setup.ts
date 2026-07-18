import { vi } from "vitest";

// `server-only`'s package.json throws unconditionally from its default
// export - it only resolves to a no-op under Next.js's own bundler-level
// "react-server" condition, which Vite/Vitest has no knowledge of. Every
// server-side module in this app (`env.server.ts`, Server Actions, the
// Supabase admin/server clients, etc.) imports it, so without this mock
// nothing that touches server-only code could be imported in a test at all.
vi.mock("server-only", () => ({}));
