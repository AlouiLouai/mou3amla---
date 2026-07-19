import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { logger } from "@/lib/logger";

function lastLoggedLine(spy: ReturnType<typeof vi.spyOn>) {
  const call = spy.mock.calls.at(-1);
  return JSON.parse(call?.[0] as string) as Record<string, unknown>;
}

describe("logger redaction", () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
    warnSpy.mockRestore();
  });

  it("redacts known-sensitive keys anywhere in the context, including nested objects", () => {
    logger.warn("test event", {
      userId: "user-1",
      phone: "+21620123456",
      nested: { routing_value: "12345678901234567890", credentialId: "abc" },
    });

    const line = lastLoggedLine(warnSpy);
    expect(line.userId).toBe("user-1");
    expect(line.phone).toBe("[redacted]");
    expect((line.nested as Record<string, unknown>).routing_value).toBe("[redacted]");
    expect((line.nested as Record<string, unknown>).credentialId).toBe("[redacted]");
  });

  it("leaves non-sensitive fields and error details intact", () => {
    logger.error("boom", new Error("something broke"), { transactionId: "tx-1" });

    const line = lastLoggedLine(errorSpy);
    expect(line.transactionId).toBe("tx-1");
    expect((line.error as Record<string, unknown>).message).toBe("something broke");
    expect((line.error as Record<string, unknown>).name).toBe("Error");
  });

  it("redacts sensitive keys inside arrays of objects", () => {
    logger.warn("bulk event", { rows: [{ phone: "+21699999999" }, { phone: "+21688888888" }] });

    const line = lastLoggedLine(warnSpy);
    const rows = line.rows as Record<string, unknown>[];
    expect(rows[0].phone).toBe("[redacted]");
    expect(rows[1].phone).toBe("[redacted]");
  });
});
