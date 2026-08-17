import type { TranslateFn } from "@/src/i18n/use-i18n";
import { Action, Model } from "@/src/model";
import type { ThoughtSaveOutboxRecord } from "@/src/model/thought-save";
import { useFocusEffect } from "expo-router";
import { Button, Typography } from "heroui-native";
import React from "react";
import { View } from "react-native";
import type { ThoughtEntryRoute } from "./thought-entry-form";

/**
 * Aggregated recovery surface for outbox records that need attention. Hosted by
 * Home, and by the compatibility create screen, which shares the same outbox.
 *
 * Durable, non-Toast: unlike the transient save Toast, this stays visible across
 * a whole Home visit and is rediscoverable on a later one - dismissal here is
 * presentation-only (never a durable flag, never removes the underlying record).
 *
 * Each record exposes Retry (priority) and a destructive-confirmed Discard,
 * both routed through `Action`s the model already owns. Retry is globally
 * disabled while any one record has `retryRequested` - the model only ever
 * lets one queued Retry run at a time, so every button must respect that, not
 * just the record that requested it.
 */
export function HomeThoughtRecovery(props: {
  model: Model.Ready;
  dispatch: Action.Dispatch;
  translate: TranslateFn;
  /** Home's durable draft is Home's alone: its cleanup note never leaves it. */
  route?: ThoughtEntryRoute;
}) {
  const { model, dispatch, translate: t, route = "home" } = props;
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
    route === "home" &&
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
  // the model queues at most one explicit Retry at a time (see model.ts's
  // retry-thought-save guard) - a per-record disable would silently no-op a
  // second press instead of giving feedback, so every button shares this.
  const retryQueued = model.thoughtSaveOutbox.some(
    (record) => record.retryRequested
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
          retryQueued={retryQueued}
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
          retryQueued={retryQueued}
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
  retryQueued: boolean;
}) {
  const { record, dispatch, translate: t, label, description, note, retryQueued } =
    props;
  const id = record.submissionId;
  const [discarding, setDiscarding] = React.useState(false);
  // internal IDs are never shown as a label - an empty Automatic Thought
  // falls back to a localized placeholder instead
  const excerpt =
    record.thought.automaticThought || t("cbt_form.recovery_untitled");
  // driven by the record's own `thoughtPersisted` flag, never by which status
  // list it came from: a "cleanup-failed" record is always persisted (storage
  // invariant), but an "uncertain" one (a restart-interrupted write, see
  // `Model.ready`) can be persisted too if the crash landed between the write
  // succeeding and the outbox record being removed - claiming that Thought was
  // "never saved" would be flatly false, which the design explicitly forbids.
  const discardConfirmCopy = record.thoughtPersisted
    ? t("cbt_form.recovery_discard_confirm_safe")
    : record.status === "uncertain"
      ? t("cbt_form.recovery_discard_confirm_uncertain")
      : t("cbt_form.recovery_discard_confirm_lossy");
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
        accessibilityLabel={excerpt}
      >
        {excerpt}
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
      <View className="flex-row gap-2">
        <Button
          testID={`home-thought-recovery-retry-${id}`}
          size="sm"
          isDisabled={retryQueued}
          onPress={() => dispatch(Action.retryThoughtSave(id))}
        >
          {t("cbt_form.recovery_retry")}
        </Button>
        {!discarding ? (
          <Button
            testID={`home-thought-recovery-discard-${id}`}
            variant="tertiary"
            size="sm"
            onPress={() => setDiscarding(true)}
          >
            {t("cbt_form.recovery_discard")}
          </Button>
        ) : null}
      </View>
      {discarding ? (
        <View
          testID={`home-thought-recovery-discard-confirm-${id}`}
          accessibilityRole="alert"
          className="gap-2 rounded-md border border-border bg-surface-secondary p-2"
        >
          <Typography type="body-sm">{discardConfirmCopy}</Typography>
          <View className="flex-row gap-3">
            <Button
              testID={`home-thought-recovery-discard-confirm-yes-${id}`}
              className="flex-1"
              onPress={() => dispatch(Action.discardThoughtSave(id))}
            >
              {t("cbt_form.recovery_discard_yes")}
            </Button>
            <Button
              testID={`home-thought-recovery-discard-cancel-${id}`}
              variant="secondary"
              className="flex-1"
              onPress={() => setDiscarding(false)}
            >
              {t("cbt_form.recovery_discard_no")}
            </Button>
          </View>
        </View>
      ) : null}
    </View>
  );
}
