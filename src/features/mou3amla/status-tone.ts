import { mou3amla } from "@/features/mou3amla/constants";

export type SemanticStatus = "positive" | "pending" | "negative" | "neutral";

/** Centralizes the status-badge color mapping (label/copy/icon stay screen-specific) - "positive" reuses accent blue, matching the mockup's own verified/success color. */
export function statusToneColor(status: SemanticStatus): string {
  switch (status) {
    case "positive":
      return mou3amla.accent;
    case "pending":
      return mou3amla.subtle;
    case "negative":
      return mou3amla.destructive;
    case "neutral":
      return mou3amla.textMuted;
  }
}
