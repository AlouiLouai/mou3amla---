import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/features/auth/server/dal", () => ({ getSessionIdentity: vi.fn() }));
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/features/payments/server/provider-checkouts", () => ({ createProviderCheckout: vi.fn() }));

const { createAdminClient } = await import("@/lib/supabase/admin");
const { getSessionIdentity } = await import("@/features/auth/server/dal");
const { checkRateLimit } = await import("@/lib/rate-limit");
const { createProviderCheckout } = await import("@/features/payments/server/provider-checkouts");
const { createPaymentIntent } = await import("@/features/payments/server/actions");

const SENDER_ID = "11111111-1111-1111-1111-111111111111";
const RECIPIENT_ID = "22222222-2222-2222-2222-222222222222";
const SOURCE_WALLET_ID = "33333333-3333-4333-8333-333333333333";
const RECIPIENT_DESTINATION_ID = "44444444-4444-4444-8444-444444444444";

const VALID_INPUT = { sourceWalletId: SOURCE_WALLET_ID, recipientUsername: "recipientuser", amount: 25 };

/** Minimal awaitable Supabase query-builder fake: one `.from(...)` call
 * dequeues the next queued `{data, error}` result, regardless of whether the
 * caller awaits the builder directly, `.maybeSingle()`, or `.single()`. */
function makeFrom(queue: unknown[]) {
  const calls: { table: string; op: string; args: unknown[] }[] = [];

  const from = vi.fn((table: string) => {
    const result = queue.shift() ?? { data: null, error: null };
    const builder: Record<string, unknown> = {
      select: (...args: unknown[]) => {
        calls.push({ table, op: "select", args });
        return builder;
      },
      insert: (...args: unknown[]) => {
        calls.push({ table, op: "insert", args });
        return builder;
      },
      eq: () => builder,
      gte: () => builder,
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

const senderRow = { data: { id: SENDER_ID, username: "sender", display_name: "Sender Person" }, error: null };
const sourceWalletRow = { data: { id: SOURCE_WALLET_ID, user_id: SENDER_ID, provider_id: "flouci", name: "Flouci", routing_value: "@sender" }, error: null };
const recipientRow = {
  data: { id: RECIPIENT_ID, username: "recipientuser", display_name: "Recipient Person", verification_status: "verified" },
  error: null,
};
const recipientDestinationRow = {
  data: { id: RECIPIENT_DESTINATION_ID, user_id: RECIPIENT_ID, provider_id: "biat", name: "BIAT", routing_value: "12345678901234567890" },
  error: null,
};
const transactionRow = {
  data: {
    id: "tx-1",
    ref_id: "ref_abc123",
    amount: "25",
    status: "initiated",
    metadata: {
      provider_id: "flouci",
      provider_name: "Flouci",
      provider_checkout_url: "https://checkout.example/flouci",
      provider_payment_ref: "flouci-pay-1",
    },
    created_at: "2026-07-18T10:00:00.000Z",
  },
  error: null,
};

beforeEach(() => {
  vi.mocked(createAdminClient).mockReset();
  vi.mocked(getSessionIdentity).mockReset().mockResolvedValue({ userId: SENDER_ID, phone: "+21620123456" } as never);
  vi.mocked(checkRateLimit).mockReset().mockResolvedValue(true);
  vi.mocked(createProviderCheckout).mockReset().mockResolvedValue({
    ok: true,
    providerId: "flouci",
    providerName: "Flouci",
    checkoutUrl: "https://checkout.example/flouci",
    providerPaymentRef: "flouci-pay-1",
    providerStatus: "PENDING",
    returnUrl: "https://app.example/payments/return/flouci?ref=ref_abc123",
    webhookUrl: "https://app.example/api/payments/providers/flouci/webhook?ref=ref_abc123",
  } as never);
});

describe("createPaymentIntent", () => {
  it("rejects an invalid amount/recipient without touching the database", async () => {
    const result = await createPaymentIntent({ sourceWalletId: SOURCE_WALLET_ID, recipientUsername: "!!", amount: -5 });

    expect(result).toEqual({ ok: false, message: expect.any(String) });
    expect(getSessionIdentity).not.toHaveBeenCalled();
  });

  it("requires an active session", async () => {
    vi.mocked(getSessionIdentity).mockResolvedValue(null);

    const result = await createPaymentIntent(VALID_INPUT);

    expect(result).toEqual({ ok: false, message: expect.stringMatching(/session expired/i) });
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  it("rejects when rate-limited, before touching the database", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue(false);

    const result = await createPaymentIntent(VALID_INPUT);

    expect(result).toEqual({ ok: false, message: expect.stringMatching(/too many/i) });
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  it("rejects when the source wallet doesn't belong to the caller", async () => {
    const { admin } = makeFakeAdmin([senderRow, { data: null, error: null }, recipientRow]);
    vi.mocked(createAdminClient).mockReturnValue(admin as never);

    const result = await createPaymentIntent(VALID_INPUT);

    expect(result).toEqual({ ok: false, message: expect.stringMatching(/choose one of your linked destinations/i) });
  });

  it("rejects when the selected source provider has no live sandbox checkout", async () => {
    const unsupportedSourceWalletRow = {
      data: { ...sourceWalletRow.data, provider_id: "d17", name: "D17" },
      error: null,
    };
    const { admin } = makeFakeAdmin([senderRow, unsupportedSourceWalletRow, recipientRow]);
    vi.mocked(createAdminClient).mockReturnValue(admin as never);

    const result = await createPaymentIntent(VALID_INPUT);

    expect(result).toEqual({ ok: false, message: expect.stringMatching(/only flouci and konnect/i) });
    expect(createProviderCheckout).not.toHaveBeenCalled();
  });

  it("rejects when the recipient doesn't exist", async () => {
    const { admin } = makeFakeAdmin([senderRow, sourceWalletRow, { data: null, error: null }]);
    vi.mocked(createAdminClient).mockReturnValue(admin as never);

    const result = await createPaymentIntent(VALID_INPUT);

    expect(result).toEqual({ ok: false, message: expect.stringMatching(/doesn't exist/i) });
  });

  it("blocks sending to yourself", async () => {
    const selfRow = { data: { ...recipientRow.data, id: SENDER_ID }, error: null };
    const { admin } = makeFakeAdmin([senderRow, sourceWalletRow, selfRow]);
    vi.mocked(createAdminClient).mockReturnValue(admin as never);

    const result = await createPaymentIntent(VALID_INPUT);

    expect(result).toEqual({ ok: false, message: expect.stringMatching(/another mou3amla handle/i) });
  });

  it("blocks sending to an unverified recipient", async () => {
    const unverifiedRow = { data: { ...recipientRow.data, verification_status: "unverified" }, error: null };
    const { admin } = makeFakeAdmin([senderRow, sourceWalletRow, unverifiedRow]);
    vi.mocked(createAdminClient).mockReturnValue(admin as never);

    const result = await createPaymentIntent(VALID_INPUT);

    expect(result).toEqual({ ok: false, message: expect.stringMatching(/hasn't completed identity verification/i) });
  });

  it("rejects when the recipient has no linked destination", async () => {
    const { admin } = makeFakeAdmin([senderRow, sourceWalletRow, recipientRow, { data: null, error: null }]);
    vi.mocked(createAdminClient).mockReturnValue(admin as never);

    const result = await createPaymentIntent(VALID_INPUT);

    expect(result).toEqual({ ok: false, message: expect.stringMatching(/hasn't linked a destination/i) });
  });

  it("creates the transaction, sender notification, and checkout on success", async () => {
    const noDuplicate = { data: null, error: null };
    const notificationRows = {
      data: [
        { id: "notif-sender", user_id: SENDER_ID, type: "payment_sent", title: "t1", body: "b1", unread: true, created_at: "2026-07-18T10:00:00.000Z" },
      ],
      error: null,
    };
    const { admin, calls } = makeFakeAdmin([
      senderRow,
      sourceWalletRow,
      recipientRow,
      recipientDestinationRow,
      noDuplicate,
      transactionRow,
      notificationRows,
    ]);
    vi.mocked(createAdminClient).mockReturnValue(admin as never);

    const result = await createPaymentIntent(VALID_INPUT);

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok result");
    expect(result.intent).toMatchObject({ id: "tx-1", refId: "ref_abc123", recipient: "@recipientuser" });
    expect(result.senderNotification).toMatchObject({ id: "notif-sender", type: "payment_sent" });
    expect(result.checkout).toMatchObject({ providerId: "flouci", url: "https://checkout.example/flouci" });

    const insertCall = calls.find((call) => call.table === "payment_transactions" && call.op === "insert");
    expect(insertCall?.args[0]).toMatchObject({ sender_user_id: SENDER_ID, recipient_user_id: RECIPIENT_ID, amount: 25 });
    expect(createProviderCheckout).toHaveBeenCalled();
  });

  it("still returns success with a locally-built notification if the notification insert fails", async () => {
    const { admin } = makeFakeAdmin([
      senderRow,
      sourceWalletRow,
      recipientRow,
      recipientDestinationRow,
      { data: null, error: null },
      transactionRow,
      { data: null, error: { message: "insert failed" } },
    ]);
    vi.mocked(createAdminClient).mockReturnValue(admin as never);

    const result = await createPaymentIntent(VALID_INPUT);

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok result");
    expect(result.senderNotification.type).toBe("payment_sent");
  });

  it("reuses a recent duplicate transaction instead of inserting a second one (double-submit guard)", async () => {
    const existingNotifications = {
      data: [
        {
          id: "notif-sender",
          user_id: SENDER_ID,
          type: "payment_sent",
          title: "t1",
          body: "b1",
          unread: true,
          created_at: "2026-07-18T10:00:00.000Z",
        },
      ],
      error: null,
    };
    const { admin, calls } = makeFakeAdmin([
      senderRow,
      sourceWalletRow,
      recipientRow,
      recipientDestinationRow,
      transactionRow,
      existingNotifications,
    ]);
    vi.mocked(createAdminClient).mockReturnValue(admin as never);

    const result = await createPaymentIntent(VALID_INPUT);

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok result");
    expect(result.intent.id).toBe("tx-1");
    expect(result.checkout.url).toBe("https://checkout.example/flouci");

    const insertCall = calls.find((call) => call.table === "payment_transactions" && call.op === "insert");
    expect(insertCall).toBeUndefined();
    expect(createProviderCheckout).not.toHaveBeenCalled();
  });

  it("never throws - unexpected errors are caught and reported as a friendly message", async () => {
    vi.mocked(createAdminClient).mockImplementation(() => {
      throw new Error("boom");
    });

    const result = await createPaymentIntent(VALID_INPUT);

    expect(result).toEqual({ ok: false, message: expect.any(String) });
  });
});
