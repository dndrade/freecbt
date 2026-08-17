import type { Href } from "expo-router";

export type LabExperimentStatus = "current" | "experimental" | "archived";

export interface LabExperiment {
  readonly id: string;
  readonly title: string;
  readonly description?: string;
  readonly href: Href;
  readonly group: string;
  readonly status?: LabExperimentStatus;
}

// Adding another variant (e.g. a second onboarding flow) is two edits:
// 1. its Expo Router route subtree under src/app/v2/debug/lab/**
//    (e.g. lab/onboarding/version-2/** once a second flow actually exists —
//    do not create that subtree speculatively; YAGNI until it's real)
// 2. one entry here
export const labCatalog = [
  {
    id: "onboarding-current",
    title: "Current",
    description: "Production-aligned onboarding prototype.",
    href: "/v2/debug/lab/onboarding",
    group: "Onboarding",
    status: "current",
  },
] as const satisfies readonly LabExperiment[];

export interface LabCatalogGroup {
  readonly group: string;
  readonly items: readonly LabExperiment[];
}

export function groupLabCatalog(
  catalog: readonly LabExperiment[]
): readonly LabCatalogGroup[] {
  const order: string[] = [];
  const byGroup = new Map<string, LabExperiment[]>();

  for (const item of catalog) {
    if (!byGroup.has(item.group)) {
      byGroup.set(item.group, []);
      order.push(item.group);
    }
    byGroup.get(item.group)!.push(item);
  }

  return order.map((group) => ({ group, items: byGroup.get(group)! }));
}
