import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/features/payments/server/recipient-preview", () => ({ resolveRecipientPreview: vi.fn() }));

const { createAdminClient } = await import("@/lib/supabase/admin");
const { resolveRecipientPreview } = await import("@/features/payments/server/recipient-preview");
const { loadNearbyMatchByCode, buildNearbyMatchPayload } = await import("@/features/payments/server/nearby-match");

const OWNER_ID = "11111111-1111-1111-1111-111111111111";
const PAYER_ID = "22222222-2222-2222-2222-222222222222";
const OTHER_ID = "33333333-3333-4333-8333-333333333333";

function makeAdmin(row: unknown) {
  const maybeSingle = vi.fn().mockResolvedValue({ data: row, error: row ? null : new Error("not found") });
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    gt: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    maybeSingle,
  };
  return { from: vi.fn(() => builder) };
}

function baseRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "handoff-1",
    owner_user_id: OWNER_ID,
    payer_user_id: PAYER_ID,
    challenge_code: "12345",
    status: "confirmed",
    owner_accepted_at: "2026-07-27T10:00:00.000Z",
    payer_accepted_at: "2026-07-27T10:00:01.000Z",
    expires_at: "2026-07-27T10:05:00.000Z",
    amount: 15,
    ...overrides,
  };
}

const recipientPreview = {
  userId: "whoever",
  username: "someone",
  displayName: "Someone",
  verificationStatus: "verified" as const,
  primaryRouteLabel: null,
};

beforeEach(() => {
  vi.mocked(createAdminClient).mockReset();
  vi.mocked(resolveRecipientPreview).mockReset().mockResolvedValue(recipientPreview);
});

describe("loadNearbyMatchByCode", () => {
  it("returns not_found when no row matches", async () => {
    vi.mocked(createAdminClient).mockReturnValue(makeAdmin(null) as never);

    const result = await loadNearbyMatchByCode("12345", OWNER_ID);

    expect(result).toEqual({ error: "not_found" });
  });

  it("returns role=owner when the caller is the owner", async () => {
    vi.mocked(createAdminClient).mockReturnValue(makeAdmin(baseRow()) as never);

    const result = await loadNearbyMatchByCode("12345", OWNER_ID);

    expect(result).toMatchObject({ role: "owner" });
  });

  it("returns role=payer when the caller is the payer", async () => {
    vi.mocked(createAdminClient).mockReturnValue(makeAdmin(baseRow()) as never);

    const result = await loadNearbyMatchByCode("12345", PAYER_ID);

    expect(result).toMatchObject({ role: "payer" });
  });

  it("returns forbidden when the caller is neither owner nor payer", async () => {
    vi.mocked(createAdminClient).mockReturnValue(makeAdmin(baseRow()) as never);

    const result = await loadNearbyMatchByCode("12345", OTHER_ID);

    expect(result).toEqual({ error: "forbidden" });
  });
});

describe("buildNearbyMatchPayload", () => {
  beforeEach(() => {
    // resolveUsername (counterpartUsername) uses the admin client directly,
    // independent of resolveRecipientPreview's own mock above.
    vi.mocked(createAdminClient).mockReturnValue(makeAdmin({ username: "counterpart" }) as never);
  });

  it("resolves the counterpart's username from the other role's identity", async () => {
    const ownerPayload = await buildNearbyMatchPayload(baseRow({ status: "matched" }) as never, "owner");
    const payerPayload = await buildNearbyMatchPayload(baseRow({ status: "matched" }) as never, "payer");

    expect(ownerPayload.counterpartUsername).toBe("counterpart");
    expect(payerPayload.counterpartUsername).toBe("counterpart");
  });

  it("never resolves recipient before status is confirmed", async () => {
    for (const role of ["owner", "payer"] as const) {
      const payload = await buildNearbyMatchPayload(baseRow({ status: "matched" }) as never, role);
      expect(payload.recipient).toBeUndefined();
    }
    expect(resolveRecipientPreview).not.toHaveBeenCalled();
  });

  it("resolves recipient from the owner once confirmed, for either role", async () => {
    for (const role of ["owner", "payer"] as const) {
      vi.mocked(resolveRecipientPreview).mockClear();
      const payload = await buildNearbyMatchPayload(baseRow() as never, role);

      expect(payload.recipient).toEqual(recipientPreview);
      expect(resolveRecipientPreview).toHaveBeenCalledWith({ recipientUserId: OWNER_ID });
    }
  });

  it("passes through code, status, amount, and accepted flags unchanged", async () => {
    const payload = await buildNearbyMatchPayload(baseRow({ status: "matched" }) as never, "payer");

    expect(payload).toMatchObject({
      code: "12345",
      status: "matched",
      amount: 15,
      ownerAccepted: true,
      payerAccepted: true,
      isOwner: false,
    });
  });

  it("isOwner reflects the caller's role", async () => {
    const ownerPayload = await buildNearbyMatchPayload(baseRow({ status: "matched" }) as never, "owner");
    const payerPayload = await buildNearbyMatchPayload(baseRow({ status: "matched" }) as never, "payer");

    expect(ownerPayload.isOwner).toBe(true);
    expect(payerPayload.isOwner).toBe(false);
  });
});
