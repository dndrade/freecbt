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
 * Note: These are the main hub tabs. The hub section also contains
 * nested settings pages (general, appearance, data, wellbeing, support, about)
 * but those are not top-level tabs.
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
  {
    name: "settings/index",
    labelKey: "accessibility.settings_button",
    icon: "settings",
  },
];
