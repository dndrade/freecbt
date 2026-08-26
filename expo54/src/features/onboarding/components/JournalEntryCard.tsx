import React from "react";
import { View } from "react-native";
import { Typography } from "heroui-native";
import { useI18n } from "@/i18n/use-i18n";

export interface JournalEntryCardProps {
  thought?: string;
}

export const JournalEntryCard: React.FC<JournalEntryCardProps> = ({
  thought,
}) => {
  const i18n = useI18n();
  const hasThought = Boolean(thought?.trim());

  return (
    <View className="gap-2 rounded-2xl border border-separator p-5">
      <Typography type="body-xs" className="uppercase font-bold text-secondary">
        {i18n.t("onboarding_screen.home_handoff.journal_card_eyebrow")}
      </Typography>
      {hasThought ? (
        <Typography type="body">{thought}</Typography>
      ) : (
        <Typography type="body-sm" className="text-default-500">
          {i18n.t("onboarding_screen.home_handoff.journal_card_empty")}
        </Typography>
      )}
    </View>
  );
};
