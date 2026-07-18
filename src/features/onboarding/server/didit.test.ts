import { describe, expect, it } from "vitest";
import { mapDiditStatus } from "@/features/onboarding/server/didit";

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
