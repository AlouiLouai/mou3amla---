import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "jsdom",
    globals: false,
    setupFiles: ["./vitest.setup.ts"],
    // Fake values, scoped to the test process only - just enough to satisfy
    // the zod schemas in env.ts/env.server.ts so those modules can import
    // without throwing. Tests mock the Supabase clients directly, so no real
    // credentials are ever needed (or read) here.
    env: {
      NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "test-publishable-key",
      SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key",
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    },
  },
});
