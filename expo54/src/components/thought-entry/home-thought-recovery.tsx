import type { TranslateFn } from "@/src/i18n/use-i18n";
import { Action, Model } from "@/src/model";
import type { ThoughtSaveOutboxRecord } from "@/src/platform/storage/storage";
import { useFocusEffect } from "expo-router";
import { Button, Typography } from "heroui-native";
import React from "react";
import { View } from "react-native";

/**
 * Home-only aggregated recovery surface for outbox records that need attention.
 *
 * Durable, non-Toast: unlike the transient save Toast, this stays visible across
 * a whole Home visit and is rediscoverable on a later one - dismissal here is
 * presentation-only (never a durable flag, never removes the underlying record).
 *
 * "Existing outbox actions only": the model exposes `Action.retryThoughtSave` for
 * a stuck submission, but no action to discard/delete an outbox record - that
 * would risk silently dropping a Thought the model hasn't confirmed elsewhere yet.
 * So each item's only control is Retry; the "Discard" this surface offers is the
 * already-existing Home draft discard, which lives above this component in the
 * Home tree and is entirely separate from these outbox records.
 */
export function HomeThoughtRecovery(props: {
  model: Model.Ready;
  dispatch: Action.Dispatch;
  translate: TranslateFn;
}) {
  const { model, dispatch, translate: t } = props;
  const [dismissed, setDismissed] = React.useState(false);

  // a "visit" is one focus session: returning to Home later rediscovers whatever
  // still needs attention, even if it was dismissed on an earlier visit.
  useFocusEffect(
    React.useCallback(() => {
      setDismissed(false);
    }, [])
  );

  // C/A: stuck submissions - insertion accepted, but the write itself hasn't
  // durably landed (or the app restarted mid-write, per Task 4's `uncertain`).
  const recovery = model.thoughtSaveOutbox.filter(
    (record) => record.status === "failed" || record.status === "uncertain"
  );
  // D: the Thought IS saved; only the now-redundant outbox record's own removal
  // failed. Categorically different from A/C, so it gets its own neutral copy.
  const cleanup = model.thoughtSaveOutbox.filter(
    (record) => record.status === "cleanup-failed"
  );
  // B: draft-clear-failed is never a recovery entry of its own - it is
  // subordinate metadata attached to whichever outbox record it reconciles
  // against (or, if that record already resolved, shown as a standalone note).
  const draftCleanup =
    model.homeThoughtDraft?.draftCleanup?.status === "clear-failed"
      ? model.homeThoughtDraft.draftCleanup
      : null;

  const count = recovery.length + cleanup.length;
  // still nothing worth a dismissible surface for: no live A/C/D item, and no
  // orphaned B note either (the common case - B almost always has a live
  // target, since it is only ever set right after that target's own insertion)
  if ((count === 0 && draftCleanup === null) || dismissed) return null;

  const draftCleanupTarget = [...recovery, ...cleanup].find(
    (record) => record.submissionId === draftCleanup?.outboxSubmissionId
  );

  return (
    <View
      testID="home-thought-recovery"
      accessibilityRole="alert"
      className="gap-2 rounded-lg border border-border bg-surface-secondary p-3"
    >
      <View className="flex-row items-center justify-between">
        {count > 0 ? (
          <Typography type="h4" accessibilityRole="header">
            {t("cbt_form.recovery_header", { count })}
          </Typography>
        ) : null}
        <Button
          testID="home-thought-recovery-dismiss"
          variant="tertiary"
          size="sm"
          onPress={() => setDismissed(true)}
        >
          {t("cbt_form.recovery_dismiss")}
        </Button>
      </View>
      {recovery.map((record) => (
        <RecoveryItem
          key={record.submissionId}
          record={record}
          dispatch={dispatch}
          translate={t}
          label={t("cbt_form.recovery_item_label")}
          note={
            record === draftCleanupTarget
              ? t("cbt_form.recovery_draft_cleanup_note")
              : null
          }
        />
      ))}
      {cleanup.map((record) => (
        <RecoveryItem
          key={record.submissionId}
          record={record}
          dispatch={dispatch}
          translate={t}
          label={t("cbt_form.recovery_cleanup_label")}
          description={t("cbt_form.recovery_cleanup_description")}
          note={
            record === draftCleanupTarget
              ? t("cbt_form.recovery_draft_cleanup_note")
              : null
          }
        />
      ))}
      {draftCleanup !== null && draftCleanupTarget === undefined ? (
        <Typography type="body-sm" testID="home-thought-recovery-draft-note">
          {t("cbt_form.recovery_draft_cleanup_note")}
        </Typography>
      ) : null}
    </View>
  );
}

function RecoveryItem(props: {
  record: ThoughtSaveOutboxRecord;
  dispatch: Action.Dispatch;
  translate: TranslateFn;
  label: string;
  description?: string;
  note: string | null;
}) {
  const { record, dispatch, translate: t, label, description, note } = props;
  const id = record.submissionId;
  return (
    <View
      testID={`home-thought-recovery-item-${id}`}
      className="gap-1 rounded-md border border-border p-2"
    >
      <Typography type="body-sm">{label}</Typography>
      <Typography
        testID={`home-thought-recovery-excerpt-${id}`}
        type="body-sm"
        numberOfLines={1}
        // full text stays reachable to screen readers even though the visual
        // excerpt is a single truncated line
        accessibilityLabel={record.thought.automaticThought}
      >
        {record.thought.automaticThought}
      </Typography>
      <Typography
        testID={`home-thought-recovery-timestamp-${id}`}
        type="body-sm"
      >
        {record.updatedAt.toLocaleString()}
      </Typography>
      {description ? (
        <Typography type="body-sm">{description}</Typography>
      ) : null}
      {note !== null ? (
        <Typography
          testID={`home-thought-recovery-note-${id}`}
          type="body-sm"
        >
          {note}
        </Typography>
      ) : null}
      <Button
        testID={`home-thought-recovery-retry-${id}`}
        size="sm"
        isDisabled={record.retryRequested}
        onPress={() => dispatch(Action.retryThoughtSave(id))}
      >
        {t("cbt_form.recovery_retry")}
      </Button>
    </View>
  );
}
