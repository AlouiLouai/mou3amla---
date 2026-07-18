import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));

const { createAdminClient } = await import("@/lib/supabase/admin");
const { mapDiditStatus, applyDiditPayload, claimWebhookEvent } = await import("@/features/onboarding/server/didit");

const USER_ID = "11111111-1111-1111-1111-111111111111";
const SESSION_ID = "22222222-2222-2222-2222-222222222222";

describe("mapDiditStatus", () => {
  it("maps Approved to verified", () => {
    expect(mapDiditStatus("Approved")).toBe("verified");
  });

  it.each(["Declined", "Expired", "Abandoned", "Kyc Expired"])("maps %s to rejected", (status) => {
    expect(mapDiditStatus(status)).toBe("rejected");
  });

  it.each(["Not Started", "In Progress", "Awaiting User", "Resubmitted", "In Review"])("maps %s to pending", (status) => {
    expect(mapDiditStatus(status)).toBe("pending");
  });

  it("maps an unrecognized status to pending rather than throwing", () => {
    expect(mapDiditStatus("Some Future Didit Status")).toBe("pending");
  });

  it("maps null to pending", () => {
    expect(mapDiditStatus(null)).toBe("pending");
  });
});

/** Minimal awaitable Supabase query-builder fake matching this file's actual
 * usage: one `.from(...)` call dequeues the next `{data, error}` result. */
function makeFrom(queue: unknown[]) {
  return vi.fn(() => {
    const result = queue.shift() ?? { data: null, error: null };
    const builder: Record<string, unknown> = {
      select: () => builder,
      insert: () => Promise.resolve(result),
      update: () => builder,
      eq: () => builder,
      maybeSingle: () => Promise.resolve(result),
    };
    return builder;
  });
}

function makeFakeAdmin(fromQueue: unknown[] = []) {
  return { from: makeFrom(fromQueue) };
}

describe("applyDiditPayload", () => {
  beforeEach(() => {
    vi.mocked(createAdminClient).mockReset();
  });

  it("updates the matched profile and logs a verification event on a status change", async () => {
    const admin = makeFakeAdmin([
      // previous-row select for the preferredProfileId path
      {
        data: { id: USER_ID, verification_status: "pending", didit_latest_status: "In Review", didit_session_id: SESSION_ID, didit_status_event_at: null },
        error: null,
      },
      // update().select()
      { data: { id: USER_ID, verification_status: "verified", didit_latest_status: "Approved", didit_session_id: SESSION_ID }, error: null },
      // recordVerificationEvent insert
      { data: null, error: null },
    ]);
    vi.mocked(createAdminClient).mockReturnValue(admin as never);

    const result = await applyDiditPayload({ session_id: SESSION_ID, status: "Approved" }, "didit_webhook", USER_ID);

    expect(result.matched).toBe(true);
    expect(result.verificationStatus).toBe("verified");
  });

  it("ignores a payload with no status field", async () => {
    const result = await applyDiditPayload({ session_id: SESSION_ID }, "didit_webhook", USER_ID);

    expect(result.matched).toBe(false);
    expect(result.verificationStatus).toBeNull();
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  it("skips applying a stale/out-of-order webhook event without discarding the match", async () => {
    const newerEventAt = new Date(2_000_000 * 1000).toISOString();
    const admin = makeFakeAdmin([
      {
        data: {
          id: USER_ID,
          verification_status: "verified",
          didit_latest_status: "Approved",
          didit_session_id: SESSION_ID,
          didit_status_event_at: newerEventAt,
        },
        error: null,
      },
    ]);
    vi.mocked(createAdminClient).mockReturnValue(admin as never);

    // An older, retried delivery arriving after a newer one already applied.
    const result = await applyDiditPayload({ session_id: SESSION_ID, status: "In Review", timestamp: 1_000_000 }, "didit_webhook", USER_ID);

    expect(result.matched).toBe(true);
    expect(result.verificationStatus).toBe("verified");
  });
});

describe("claimWebhookEvent", () => {
  beforeEach(() => {
    vi.mocked(createAdminClient).mockReset();
  });

  it("returns true the first time an event_id is claimed", async () => {
    const admin = makeFakeAdmin([{ data: null, error: null }]);
    vi.mocked(createAdminClient).mockReturnValue(admin as never);

    await expect(claimWebhookEvent("evt-1")).resolves.toBe(true);
  });

  it("returns false when the event_id was already claimed (unique violation)", async () => {
    const admin = makeFakeAdmin([{ data: null, error: { code: "23505" } }]);
    vi.mocked(createAdminClient).mockReturnValue(admin as never);

    await expect(claimWebhookEvent("evt-1")).resolves.toBe(false);
  });

  it("returns true on an unrelated database error rather than silently dropping a legitimate delivery", async () => {
    const admin = makeFakeAdmin([{ data: null, error: { code: "08006" } }]);
    vi.mocked(createAdminClient).mockReturnValue(admin as never);

    await expect(claimWebhookEvent("evt-1")).resolves.toBe(true);
  });
});
