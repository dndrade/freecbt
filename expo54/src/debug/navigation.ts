import type { Href } from "expo-router";

export interface DebugNavItem {
  readonly title: string;
  readonly description: string;
  readonly href: Href;
}

export const debugNavItems = [
  {
    title: "UI/UX Lab",
    description: "Prototype and evaluate user experiences.",
    href: "/v2/debug/lab",
  },
  {
    title: "Feature Diagnostics",
    description: "Inspect backup and notification flows.",
    href: "/v2/debug/diagnostics",
  },
  {
    title: "Tools",
    description: "Inspect runtime and app state.",
    href: "/v2/debug/tools",
  },
  {
    title: "Logic Demos",
    description: "Reference implementations and behavior demos.",
    href: "/v2/debug/demos",
  },
] as const satisfies readonly DebugNavItem[];
