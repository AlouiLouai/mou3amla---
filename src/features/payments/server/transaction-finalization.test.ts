import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { createAdminClient } = await import("@/lib/supabase/admin");
const { finalizePaymentTransaction } = await import("@/features/payments/server/transaction-finalization");

const SENDER_ID = "11111111-1111-1111-1111-111111111111";
const RECIPIENT_ID = "22222222-2222-2222-2222-222222222222";

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
      update: (...args: unknown[]) => {
        calls.push({ table, op: "update", args });
        return builder;
      },
      eq: () => builder,
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

// A fresh object every call - `finalizePaymentTransaction` mutates
// `transaction.status`/`.metadata` in place on whatever row `.maybeSingle()`
// resolves to, so reusing one shared object across tests would leak
// mutations (a previous test's "failed" status) into later ones.
function freshTransactionRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "tx-1",
    ref_id: "ref-1",
    sender_user_id: SENDER_ID,
    recipient_user_id: RECIPIENT_ID,
    amount: "25",
    recipient_username: "receiver",
    recipient_display_name: "Receiver Person",
    status: "initiated",
    metadata: {},
    created_at: "2026-07-30T10:00:00.000Z",
    ...overrides,
  };
}

const senderProfileRow = { id: SENDER_ID, username: "sender", display_name: "Sender Person" };
const noRow = { data: null, error: null };

beforeEach(() => {
  vi.mocked(createAdminClient).mockReset();
});

describe("finalizePaymentTransaction", () => {
  it("returns not found when the transaction doesn't exist", async () => {
    const { admin } = makeFakeAdmin([noRow]);
    vi.mocked(createAdminClient).mockReturnValue(admin as never);

    const result = await finalizePaymentTransaction({ refId: "ref-1", providerStatus: "X", resolvedStatus: "failed", providerPaymentRef: "P" });

    expect(result).toEqual({ ok: false, message: "Transaction not found.", status: 404 });
  });

  it("notifies only the recipient on confirmed (existing behavior unchanged)", async () => {
    const { admin, calls } = makeFakeAdmin([
      { data: freshTransactionRow(), error: null }, // transaction select
      noRow, // status update
      noRow, // hasNotification(recipient, payment_received)
      { data: senderProfileRow, error: null }, // loadProfile(sender)
      noRow, // insert payment_received
    ]);
    vi.mocked(createAdminClient).mockReturnValue(admin as never);

    const result = await finalizePaymentTransaction({ refId: "ref-1", providerStatus: "OK", resolvedStatus: "confirmed", providerPaymentRef: "P" });

    expect(result.ok).toBe(true);
    const insertCalls = calls.filter((call) => call.table === "notifications" && call.op === "insert");
    expect(insertCalls).toHaveLength(1);
    expect(insertCalls[0].args[0]).toMatchObject({ user_id: RECIPIENT_ID, type: "payment_received" });
  });

  it("notifies both the sender and the recipient on failed", async () => {
    const { admin, calls } = makeFakeAdmin([
      { data: freshTransactionRow(), error: null }, // transaction select
      noRow, // status update
      noRow, // hasNotification(sender, payment_failed)
      noRow, // insert sender payment_failed
      noRow, // hasNotification(recipient, payment_failed)
      { data: senderProfileRow, error: null }, // loadProfile(sender)
      noRow, // insert recipient payment_failed
    ]);
    vi.mocked(createAdminClient).mockReturnValue(admin as never);

    const result = await finalizePaymentTransaction({
      refId: "ref-1",
      providerStatus: "FAIL",
      resolvedStatus: "failed",
      providerPaymentRef: "P",
      failureReason: "DECLINED",
    });

    expect(result.ok).toBe(true);
    const insertCalls = calls.filter((call) => call.table === "notifications" && call.op === "insert");
    expect(insertCalls).toHaveLength(2);
    expect(insertCalls[0].args[0]).toMatchObject({ user_id: SENDER_ID, type: "payment_failed", actor_user_id: RECIPIENT_ID });
    expect(insertCalls[1].args[0]).toMatchObject({ user_id: RECIPIENT_ID, type: "payment_failed", actor_user_id: SENDER_ID });
  });

  it("only notifies the sender when the transaction has no recipient_user_id", async () => {
    const row = freshTransactionRow({ recipient_user_id: null });
    const { admin, calls } = makeFakeAdmin([
      { data: row, error: null },
      noRow, // status update
      noRow, // hasNotification(sender, payment_failed)
      noRow, // insert sender payment_failed
    ]);
    vi.mocked(createAdminClient).mockReturnValue(admin as never);

    const result = await finalizePaymentTransaction({ refId: "ref-1", providerStatus: "FAIL", resolvedStatus: "failed", providerPaymentRef: "P" });

    expect(result.ok).toBe(true);
    const insertCalls = calls.filter((call) => call.table === "notifications" && call.op === "insert");
    expect(insertCalls).toHaveLength(1);
    expect(insertCalls[0].args[0]).toMatchObject({ user_id: SENDER_ID, type: "payment_failed" });
  });

  it("doesn't duplicate the sender's failure notification if one already exists", async () => {
    const { admin, calls } = makeFakeAdmin([
      { data: freshTransactionRow(), error: null },
      noRow, // status update
      { data: { id: "existing-notif" }, error: null }, // hasNotification(sender, payment_failed) -> already exists
      noRow, // hasNotification(recipient, payment_failed)
      { data: senderProfileRow, error: null }, // loadProfile(sender)
      noRow, // insert recipient payment_failed
    ]);
    vi.mocked(createAdminClient).mockReturnValue(admin as never);

    const result = await finalizePaymentTransaction({ refId: "ref-1", providerStatus: "FAIL", resolvedStatus: "failed", providerPaymentRef: "P" });

    expect(result.ok).toBe(true);
    const insertCalls = calls.filter((call) => call.table === "notifications" && call.op === "insert");
    expect(insertCalls).toHaveLength(1);
    expect(insertCalls[0].args[0]).toMatchObject({ user_id: RECIPIENT_ID, type: "payment_failed" });
  });
});
