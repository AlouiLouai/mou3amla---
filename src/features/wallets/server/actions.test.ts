import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/features/auth/server/dal", () => ({ getSessionIdentity: vi.fn() }));
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { createAdminClient } = await import("@/lib/supabase/admin");
const { getSessionIdentity } = await import("@/features/auth/server/dal");
const { checkRateLimit } = await import("@/lib/rate-limit");
const { deleteDestination, linkDestination, setPrimaryDestination } = await import("@/features/wallets/server/actions");

const USER_ID = "11111111-1111-1111-1111-111111111111";
const OTHER_USER_ID = "22222222-2222-2222-2222-222222222222";
const RIB = "12345678901234567890";

/** Minimal awaitable Supabase query-builder fake: one `.from(...)` call
 * dequeues the next configured `{data, error, count?}` result, regardless
 * of whether the caller awaits the builder directly, `.maybeSingle()`, or
 * `.single()` - matches this file's actual usage exactly. */
function makeFrom(queue: unknown[]) {
  const calls: { table: string; op: string; args: unknown[] }[] = [];

  const from = vi.fn((table: string) => {
    const result = (queue.shift() ?? { data: null, error: null }) as { data?: unknown; error?: unknown; count?: number };
    const builder: Record<string, unknown> = {
      select: (...args: unknown[]) => {
        calls.push({ table, op: "select", args });
        return builder;
      },
      insert: (...args: unknown[]) => {
        calls.push({ table, op: "insert", args });
        return builder;
      },
      update: (...args: unknown[]) => {
        calls.push({ table, op: "update", args });
        return builder;
      },
      delete: (...args: unknown[]) => {
        calls.push({ table, op: "delete", args });
        return builder;
      },
      eq: () => builder,
      neq: () => builder,
      order: () => builder,
      limit: () => builder,
      maybeSingle: () => Promise.resolve(result),
      single: () => Promise.resolve(result),
      then: (resolve: (value: unknown) => void, reject?: (reason: unknown) => void) => Promise.resolve(result).then(resolve, reject),
    };
    return builder;
  });

  return { from, calls };
}

function makeFakeAdmin(queue: unknown[] = []) {
  const { from, calls } = makeFrom(queue);
  return { admin: { from }, calls };
}

beforeEach(() => {
  vi.mocked(createAdminClient).mockReset();
  vi.mocked(getSessionIdentity).mockReset().mockResolvedValue({ userId: USER_ID, phone: "+21620123456" } as never);
  vi.mocked(checkRateLimit).mockReset().mockResolvedValue(true);
});

describe("linkDestination", () => {
  it("rejects an empty provider or routing value without touching the database", async () => {
    const result = await linkDestination({ providerId: "", routingValue: "" });

    expect(result).toEqual({ ok: false, message: expect.any(String) });
    expect(getSessionIdentity).not.toHaveBeenCalled();
  });

  it("requires an active session", async () => {
    vi.mocked(getSessionIdentity).mockResolvedValue(null);

    const result = await linkDestination({ providerId: "biat", routingValue: RIB });

    expect(result).toEqual({ ok: false, message: expect.stringMatching(/session expired/i) });
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  it("rejects when rate-limited, before touching the database", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue(false);

    const result = await linkDestination({ providerId: "biat", routingValue: RIB });

    expect(result).toEqual({ ok: false, message: expect.stringMatching(/too many/i) });
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  it("rejects an unsupported provider id", async () => {
    const result = await linkDestination({ providerId: "not-a-real-provider", routingValue: RIB });

    expect(result).toEqual({ ok: false, message: expect.stringMatching(/not supported/i) });
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  it("rejects a RIB that isn't exactly 20 digits", async () => {
    const result = await linkDestination({ providerId: "biat", routingValue: "12345" });

    expect(result).toEqual({ ok: false, message: expect.stringMatching(/20 digits/i) });
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  it("rejects an invalid wallet tag", async () => {
    const result = await linkDestination({ providerId: "flouci", routingValue: "a" });

    expect(result).toEqual({ ok: false, message: expect.stringMatching(/wallet tag/i) });
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  it("rejects when the caller isn't verified yet", async () => {
    const { admin } = makeFakeAdmin([{ data: { verification_status: "unverified" }, error: null }]);
    vi.mocked(createAdminClient).mockReturnValue(admin as never);

    const result = await linkDestination({ providerId: "biat", routingValue: RIB });

    expect(result).toEqual({ ok: false, message: expect.stringMatching(/complete identity verification/i) });
  });

  it("rejects a destination the caller already linked, with a self-specific message", async () => {
    const { admin } = makeFakeAdmin([
      { data: { verification_status: "verified" }, error: null },
      { data: { user_id: USER_ID }, error: null },
    ]);
    vi.mocked(createAdminClient).mockReturnValue(admin as never);

    const result = await linkDestination({ providerId: "biat", routingValue: RIB });

    expect(result).toEqual({ ok: false, message: expect.stringMatching(/you've already linked/i) });
  });

  it("rejects a destination already linked to a different account, without revealing whose", async () => {
    const { admin } = makeFakeAdmin([
      { data: { verification_status: "verified" }, error: null },
      { data: { user_id: OTHER_USER_ID }, error: null },
    ]);
    vi.mocked(createAdminClient).mockReturnValue(admin as never);

    const result = await linkDestination({ providerId: "biat", routingValue: RIB });

    expect(result.ok).toBe(false);
    expect((result as { message: string }).message).toMatch(/already linked to another mou3amla account/i);
    expect((result as { message: string }).message).not.toContain(OTHER_USER_ID);
  });

  it("links successfully and marks it default when it's the caller's first destination", async () => {
    const { admin, calls } = makeFakeAdmin([
      { data: { verification_status: "verified" }, error: null },
      { data: null, error: null }, // no existing destination anywhere
      { count: 0, error: null }, // caller has zero destinations so far
      {
        data: {
          id: "dest-1",
          provider_id: "biat",
          name: "BIAT",
          network: "BIAT · Interbank",
          color: "#22A879",
          initials: "BI",
          routing_type: "rib",
          routing_value: RIB,
          is_default: true,
        },
        error: null,
      },
    ]);
    vi.mocked(createAdminClient).mockReturnValue(admin as never);

    const result = await linkDestination({ providerId: "biat", routingValue: RIB });

    expect(result).toEqual({ ok: true, wallet: expect.objectContaining({ id: "dest-1", isDefault: true }), sourceWalletId: "dest-1" });
    const insertCall = calls.find((call) => call.op === "insert");
    expect(insertCall?.args[0]).toMatchObject({ user_id: USER_ID, provider_id: "biat", routing_value: RIB, is_default: true });
  });

  it("does not mark it default when the caller already has other destinations", async () => {
    const { admin, calls } = makeFakeAdmin([
      { data: { verification_status: "verified" }, error: null },
      { data: null, error: null },
      { count: 2, error: null },
      {
        data: {
          id: "dest-2",
          provider_id: "flouci",
          name: "Flouci",
          network: "Flouci",
          color: "#2FE6A3",
          initials: "FL",
          routing_type: "wallet_tag",
          routing_value: "@newtag",
          is_default: false,
        },
        error: null,
      },
    ]);
    vi.mocked(createAdminClient).mockReturnValue(admin as never);

    const result = await linkDestination({ providerId: "flouci", routingValue: "newtag" });

    expect(result).toEqual({ ok: true, wallet: expect.objectContaining({ isDefault: false }), sourceWalletId: "" });
    const insertCall = calls.find((call) => call.op === "insert");
    expect(insertCall?.args[0]).toMatchObject({ is_default: false });
  });

  it("falls back to a friendly message on a race-condition unique-constraint violation", async () => {
    const { admin } = makeFakeAdmin([
      { data: { verification_status: "verified" }, error: null },
      { data: null, error: null }, // pre-check passed...
      { count: 0, error: null },
      { data: null, error: { code: "23505" } }, // ...but a concurrent insert won the race
    ]);
    vi.mocked(createAdminClient).mockReturnValue(admin as never);

    const result = await linkDestination({ providerId: "biat", routingValue: RIB });

    expect(result).toEqual({ ok: false, message: expect.stringMatching(/just linked/i) });
  });

  it("never throws - unexpected errors are caught and reported as a friendly message", async () => {
    vi.mocked(createAdminClient).mockImplementation(() => {
      throw new Error("boom");
    });

    const result = await linkDestination({ providerId: "biat", routingValue: RIB });

    expect(result).toEqual({ ok: false, message: expect.any(String) });
  });
});

describe("setPrimaryDestination", () => {
  const VALID_DESTINATION_ID = "33333333-3333-4333-8333-333333333333";

  it("rejects a non-uuid destination id without touching the database", async () => {
    const result = await setPrimaryDestination({ destinationId: "not-a-uuid" });

    expect(result).toEqual({ ok: false, message: expect.any(String) });
    expect(getSessionIdentity).not.toHaveBeenCalled();
  });

  it("requires an active session", async () => {
    vi.mocked(getSessionIdentity).mockResolvedValue(null);

    const result = await setPrimaryDestination({ destinationId: VALID_DESTINATION_ID });

    expect(result).toEqual({ ok: false, message: expect.stringMatching(/session expired/i) });
  });

  it("rejects a destination that doesn't belong to the caller", async () => {
    const { admin } = makeFakeAdmin([{ data: null, error: null }]);
    vi.mocked(createAdminClient).mockReturnValue(admin as never);

    const result = await setPrimaryDestination({ destinationId: VALID_DESTINATION_ID });

    expect(result).toEqual({ ok: false, message: expect.stringMatching(/doesn't belong/i) });
  });

  it("resets the previous default and applies the new one for the caller's own destination", async () => {
    const { admin, calls } = makeFakeAdmin([
      { data: { id: VALID_DESTINATION_ID }, error: null }, // ownership check
      { data: null, error: null }, // reset previous default
      { data: null, error: null }, // apply new default
    ]);
    vi.mocked(createAdminClient).mockReturnValue(admin as never);

    const result = await setPrimaryDestination({ destinationId: VALID_DESTINATION_ID });

    expect(result).toEqual({ ok: true });
    const updateCalls = calls.filter((call) => call.op === "update");
    expect(updateCalls[0].args[0]).toEqual({ is_default: false });
    expect(updateCalls[1].args[0]).toEqual({ is_default: true });
  });
});

describe("deleteDestination", () => {
  const VALID_DESTINATION_ID = "44444444-4444-4444-8444-444444444444";
  const FALLBACK_DESTINATION_ID = "55555555-5555-4555-8555-555555555555";

  it("rejects a non-uuid destination id without touching the database", async () => {
    const result = await deleteDestination({ destinationId: "not-a-uuid" });

    expect(result).toEqual({ ok: false, message: expect.any(String) });
    expect(getSessionIdentity).not.toHaveBeenCalled();
  });

  it("requires an active session", async () => {
    vi.mocked(getSessionIdentity).mockResolvedValue(null);

    const result = await deleteDestination({ destinationId: VALID_DESTINATION_ID });

    expect(result).toEqual({ ok: false, message: expect.stringMatching(/session expired/i) });
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  it("rejects when rate-limited, before touching the database", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue(false);

    const result = await deleteDestination({ destinationId: VALID_DESTINATION_ID });

    expect(result).toEqual({ ok: false, message: expect.stringMatching(/too many/i) });
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  it("rejects a destination that doesn't belong to the caller", async () => {
    const { admin } = makeFakeAdmin([{ data: null, error: null }]);
    vi.mocked(createAdminClient).mockReturnValue(admin as never);

    const result = await deleteDestination({ destinationId: VALID_DESTINATION_ID });

    expect(result).toEqual({ ok: false, message: expect.stringMatching(/doesn't belong/i) });
  });

  it("deletes a non-default destination without changing the default route", async () => {
    const { admin, calls } = makeFakeAdmin([
      { data: { id: VALID_DESTINATION_ID, is_default: false }, error: null },
      { data: null, error: null },
    ]);
    vi.mocked(createAdminClient).mockReturnValue(admin as never);

    const result = await deleteDestination({ destinationId: VALID_DESTINATION_ID });

    expect(result).toEqual({ ok: true, deletedId: VALID_DESTINATION_ID, nextSourceWalletId: "" });
    expect(calls.find((call) => call.op === "delete")?.table).toBe("linked_destinations");
  });

  it("deletes the default destination and promotes the next available one", async () => {
    const { admin, calls } = makeFakeAdmin([
      { data: { id: VALID_DESTINATION_ID, is_default: true }, error: null },
      { data: null, error: null },
      { data: { id: FALLBACK_DESTINATION_ID }, error: null },
      { data: null, error: null },
      { data: null, error: null },
    ]);
    vi.mocked(createAdminClient).mockReturnValue(admin as never);

    const result = await deleteDestination({ destinationId: VALID_DESTINATION_ID });

    expect(result).toEqual({ ok: true, deletedId: VALID_DESTINATION_ID, nextSourceWalletId: FALLBACK_DESTINATION_ID });
    const updateCalls = calls.filter((call) => call.op === "update");
    expect(updateCalls[0].args[0]).toEqual({ is_default: false });
    expect(updateCalls[1].args[0]).toEqual({ is_default: true });
  });

  it("deletes the only remaining destination and leaves no default route", async () => {
    const { admin } = makeFakeAdmin([
      { data: { id: VALID_DESTINATION_ID, is_default: true }, error: null },
      { data: null, error: null },
      { data: null, error: null },
    ]);
    vi.mocked(createAdminClient).mockReturnValue(admin as never);

    const result = await deleteDestination({ destinationId: VALID_DESTINATION_ID });

    expect(result).toEqual({ ok: true, deletedId: VALID_DESTINATION_ID, nextSourceWalletId: "" });
  });

  it("never throws - unexpected errors are caught and reported as a friendly message", async () => {
    vi.mocked(createAdminClient).mockImplementation(() => {
      throw new Error("boom");
    });

    const result = await deleteDestination({ destinationId: VALID_DESTINATION_ID });

    expect(result).toEqual({ ok: false, message: expect.any(String) });
  });
});
