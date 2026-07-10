import { spawnSync } from "node:child_process";
import { createSerwistRoute } from "@serwist/turbopack";

// Ties the precache revision to the current commit so the service worker
// only re-fetches the offline fallback when the repo actually changes.
function getRevision(): string {
  const result = spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf-8" });
  const commit = result.stdout?.trim();
  return commit && commit.length > 0 ? commit : crypto.randomUUID();
}

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } = createSerwistRoute({
  additionalPrecacheEntries: [{ url: "/~offline", revision: getRevision() }],
  swSrc: "src/app/sw.ts",
  useNativeEsbuild: true,
});
