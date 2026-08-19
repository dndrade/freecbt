import React from "react";
import { SettingsCard } from "./settings-card";
import { SettingsRow, type SettingsRowProps } from "./settings-row";
import { SettingsSheet } from "./settings-sheet";

export type SettingsPanelItem = SettingsRowProps & { id: string };

export function SettingsPanel(props: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  items: readonly SettingsPanelItem[];
  onClosed?: () => void;
  footer?: React.ReactNode;
}) {
  const { isOpen, onOpenChange, title, items, onClosed, footer } = props;

  return (
    <SettingsSheet
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      onClosed={onClosed}
      title={title}
    >
      <SettingsCard className="mt-2">
        {items.map(({ id, ...row }) => (
          <React.Fragment key={id}>
            <SettingsRow {...row} />
          </React.Fragment>
        ))}
      </SettingsCard>
      {footer}
    </SettingsSheet>
  );
}
