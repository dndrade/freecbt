// src/constants/tabs-config.ts

import type { Feather } from "@expo/vector-icons";
import type { TranslateKey } from "@/src/i18n/use-i18n";
import React from "react";

export interface TabConfig {
  name: string; // Route name (must match file in (tabs)/ folder)
  labelKey: TranslateKey; // i18n key for tab label
  icon: React.ComponentProps<typeof Feather>["name"];
}

/**
 * Tab navigation configuration for the hub.
 * Add a new tab by adding an entry here - the layout will render it automatically.
 *
 * Keep icon names in sync with Feather icon names.
 *
 * Note: These are the main hub tabs. Settings is not a tab - it's reached via
 * the floating menu button in the tabs layout (see settings-menu-button.tsx).
 */
export const TAB_CONFIG: TabConfig[] = [
  {
    name: "thoughts",
    labelKey: "settings.hub.journal.label",
    icon: "book-open",
  },
  {
    name: "index",
    labelKey: "settings.hub.home.label",
    icon: "home",
  },
];
