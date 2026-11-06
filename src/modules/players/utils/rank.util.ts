import type { RankTier } from "../types/player.types";

export const INVESTIGATOR_RANKS: readonly RankTier[] = [
  {
    minLevel: 1,
    title: "Junior Operative",
    badge: "OP-1",
    description:
      "Probationary field clearance. Authorized for foundational inquiry and initial briefing.",
    clearanceLevel: "LEVEL 1 — CONFIDENTIAL",
  },
  {
    minLevel: 3,
    title: "Field Investigator",
    badge: "INV-2",
    description:
      "Active operative clearance. Authorized for solo inquiry and joint squad collaboration.",
    clearanceLevel: "LEVEL 2 — RESTRICTED",
  },
  {
    minLevel: 7,
    title: "Senior Detective",
    badge: "DET-3",
    description:
      "Senior field clearance. Authorized to inspect high-sensitivity clues and hidden evidence.",
    clearanceLevel: "LEVEL 3 — SECRET",
  },
  {
    minLevel: 12,
    title: "Lead Inspector",
    badge: "INSP-4",
    description:
      "Operational commander clearance. Authorized to coordinate complex multi-act mystery cases.",
    clearanceLevel: "LEVEL 4 — TOP SECRET",
  },
  {
    minLevel: 20,
    title: "Master Sleuth",
    badge: "MST-5",
    description:
      "Apex investigative clearance. Network-wide authority across international syndicates.",
    clearanceLevel: "LEVEL 5 — OMEGA CLEARANCE",
  },
] as const;

export const AVAILABLE_SPECIALIZATIONS = [
  "Field Intelligence",
  "Forensic Analysis",
  "Cipher & Cryptography",
  "Interrogation & Profiling",
] as const;

export type Specialization = (typeof AVAILABLE_SPECIALIZATIONS)[number];

export const DEFAULT_SPECIALIZATION: Specialization = "Field Intelligence";

/**
 * Derives the investigator's operational rank based strictly on their level.
 */
export function getRankForLevel(level: number): RankTier {
  const normalizedLevel = Math.max(1, Math.floor(level));

  // Search from highest to lowest threshold
  for (let i = INVESTIGATOR_RANKS.length - 1; i >= 0; i--) {
    const tier = INVESTIGATOR_RANKS[i];
    if (normalizedLevel >= tier.minLevel) {
      return tier;
    }
  }

  return INVESTIGATOR_RANKS[0];
}
