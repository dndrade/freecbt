import type { Model } from "@/src/model";
import { Typography } from "heroui-native";
import { View } from "react-native";

/**
 * Recovery banner for interrupted thought saves and failed draft cleanup.
 * Shared by the Home tab and the compatibility create screen; neither owns it.
 */
export function ThoughtSaveRecovery(props: { model: Model.Ready }) {
  const { model } = props;
  const recovery = model.thoughtSaveOutbox.filter(
    (record) => record.status !== "cleanup-failed"
  );
  const cleanup = model.thoughtSaveOutbox.filter(
    (record) => record.status === "cleanup-failed"
  );
  const draftCleanupFailed =
    model.homeThoughtDraft?.draftCleanup?.status === "clear-failed";
  if (recovery.length === 0 && cleanup.length === 0 && !draftCleanupFailed) {
    return null;
  }
  return (
    <View
      testID="thought-save-recovery"
      accessibilityRole="alert"
      className="gap-1 rounded-lg border border-border bg-surface-secondary p-3"
    >
      <Typography type="h4" accessibilityRole="header">
        Thought recovery needed
      </Typography>
      {draftCleanupFailed ? (
        <Typography type="body-sm">Draft cleanup needs attention</Typography>
      ) : null}
      {recovery.map((record) => (
        <Typography key={record.submissionId} type="body-sm">
          Recovery needed: {record.thought.automaticThought}
        </Typography>
      ))}
      {cleanup.map((record) => (
        <Typography key={record.submissionId} type="body-sm">
          Saved Thought cleanup needed: {record.thought.automaticThought}
        </Typography>
      ))}
    </View>
  );
}
