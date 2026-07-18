import { describe, expect, it } from "vitest";
import {
  buildDisplayName,
  formatPhoneForDisplay,
  formatUsernameHandle,
  landingInputSchema,
  normalizePhoneForAuth,
} from "@/features/auth/lib/identity";

describe("landingInputSchema", () => {
  it("accepts a valid 8-digit phone and username", () => {
    const result = landingInputSchema.safeParse({ phone: "20123456", username: "louai" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.phone).toBe("20123456");
      expect(result.data.username).toBe("louai");
    }
  });

  it("strips non-digits and a leading @ before validating", () => {
    const result = landingInputSchema.safeParse({ phone: "20 123 456", username: "@Louai" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.phone).toBe("20123456");
      expect(result.data.username).toBe("louai");
    }
  });

  it("rejects a phone number that isn't 8 digits", () => {
    const result = landingInputSchema.safeParse({ phone: "2012345", username: "louai" });
    expect(result.success).toBe(false);
  });

  it("rejects a username shorter than 3 characters", () => {
    const result = landingInputSchema.safeParse({ phone: "20123456", username: "ab" });
    expect(result.success).toBe(false);
  });

  it("rejects a username with characters outside [a-z0-9_]", () => {
    const result = landingInputSchema.safeParse({ phone: "20123456", username: "louai!" });
    expect(result.success).toBe(false);
  });
});

describe("normalizePhoneForAuth", () => {
  it("prefixes 8 raw digits with +216", () => {
    expect(normalizePhoneForAuth("20123456")).toBe("+21620123456");
  });
});

describe("formatPhoneForDisplay", () => {
  it("formats an E.164 number as grouped local digits", () => {
    expect(formatPhoneForDisplay("+21620123456")).toBe("20 123 456");
  });

  it("formats raw local digits the same way", () => {
    expect(formatPhoneForDisplay("20123456")).toBe("20 123 456");
  });

  it("returns the input unchanged if it isn't 8 digits", () => {
    expect(formatPhoneForDisplay("123")).toBe("123");
  });
});

describe("formatUsernameHandle / buildDisplayName", () => {
  it("prefixes a bare username with @", () => {
    expect(formatUsernameHandle("louai")).toBe("@louai");
  });

  it("doesn't double the @ if already present", () => {
    expect(formatUsernameHandle("@louai")).toBe("@louai");
  });

  it("lowercases the handle", () => {
    expect(formatUsernameHandle("Louai")).toBe("@louai");
  });

  it("buildDisplayName is the same as the formatted handle", () => {
    expect(buildDisplayName("louai")).toBe("@louai");
  });
});
