import { mou3amla } from "@/features/mou3amla/constants";

/** Every screen that shows a status badge (KYC verification, activity,
 * profile) used to hardcode its own green/orange/red - four different,
 * mutually-inconsistent greens existed for "verified" alone. The mockup
 * itself never introduces a separate success color: its verified badge and
 * success checkmark both reuse the accent blue. Centralizing the color
 * mapping here (not the label/copy/icon, which stay screen-specific) means
 * every "positive" state now shares one real color, not four coincidentally
 * similar ones. */
export type SemanticStatus = "positive" | "pending" | "negative" | "neutral";

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
