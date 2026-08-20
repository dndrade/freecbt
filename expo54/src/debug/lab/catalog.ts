import type { Href } from "expo-router";

export type LabExperimentStatus = "current" | "experimental" | "archived";

export interface LabVariant {
  readonly id: string;
  readonly title: string;
  readonly description?: string;
  readonly href: Href;
  readonly status?: LabExperimentStatus;
}

export interface LabScenario {
  readonly id: string;
  readonly title: string;
  readonly description?: string;
  readonly href: Href;
  readonly variants: readonly LabVariant[];
}

export interface LabFamily {
  readonly id: string;
  readonly title: string;
  readonly description?: string;
  readonly href: Href;
  readonly scenarios?: readonly LabScenario[];
}

// Adding another variant is two edits:
// 1. its Expo Router route subtree under src/app/v2/debug/lab/**
// 2. one entry in the matching scenario below
export const labFamilies = [
  {
    id: "onboarding",
    title: "Onboarding",
    description: "Current onboarding prototype.",
    href: "/v2/debug/lab/onboarding",
  },
  {
    id: "settings",
    title: "Settings",
    description: "Current settings baselines and entry flows.",
    href: "/v2/debug/lab/settings",
    scenarios: [
      {
        id: "main-settings",
        title: "Main Settings",
        description: "Current settings home experience.",
        href: "/v2/debug/lab/settings/main",
        variants: [
          {
            id: "main-settings-current",
            title: "Current",
            description: "Production-like settings home.",
            href: "/v2/debug/lab/settings/main/current",
            status: "current",
          },
        ],
      },
      {
        id: "pin-setup",
        title: "PIN Setup",
        description: "Current PIN setup flow.",
        href: "/v2/debug/lab/settings/pin",
        variants: [
          {
            id: "pin-setup-current",
            title: "Current",
            description: "Production-like PIN entry flow.",
            href: "/v2/debug/lab/settings/pin/current",
            status: "current",
          },
        ],
      },
      {
        id: "backup-setup",
        title: "Backup Setup",
        description: "Current backup setup entry flow.",
        href: "/v2/debug/lab/settings/backup",
        variants: [
          {
            id: "backup-setup-current",
            title: "Current",
            description: "Production-like backup setup flow.",
            href: "/v2/debug/lab/settings/backup/current",
            status: "current",
          },
        ],
      },
      {
        id: "secure-backups-v2",
        title: "Secure Backups (v2)",
        description: "Proposed secure-vault backup setup experience (mocked).",
        href: "/v2/debug/lab/settings/secure-backups-v2",
        variants: [
          {
            id: "secure-backups-v2-current",
            title: "Proposed",
            description: "Mocked 9-screen secure backups setup flow.",
            href: "/v2/debug/lab/settings/secure-backups-v2/current",
            status: "experimental",
          },
        ],
      },
      {
        id: "export",
        title: "Export",
        description: "Current export experience.",
        href: "/v2/debug/lab/settings/export",
        variants: [
          {
            id: "export-current",
            title: "Current",
            description: "Production-like export experience.",
            href: "/v2/debug/lab/settings/export/current",
            status: "current",
          },
        ],
      },
    ],
  },
] as const satisfies readonly LabFamily[];

function findById<T extends { readonly id: string }>(
  items: readonly T[],
  id: string
): T {
  const match = items.find((item) => item.id === id);
  if (!match) {
    throw new Error(`unknown lab item: ${id}`);
  }
  return match;
}

export function getLabFamily(id: string): LabFamily {
  return findById(labFamilies, id);
}

export function getLabScenario(familyId: string, scenarioId: string): LabScenario {
  const family = getLabFamily(familyId);
  if (!family.scenarios) {
    throw new Error(`family has no scenarios: ${familyId}`);
  }
  return findById(family.scenarios, scenarioId);
}

export function getLabVariant(
  familyId: string,
  scenarioId: string,
  variantId: string
): LabVariant {
  return findById(getLabScenario(familyId, scenarioId).variants, variantId);
}
