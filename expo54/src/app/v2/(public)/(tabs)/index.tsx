import { useHomeThoughtDraft } from "@/src/hooks/use-home-thought-draft";
import { LoadModel, ModelLoadedProps } from "@/src/hooks/use-model";
import { Thought } from "@/src/model";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CBTForm, ThoughtSaveRecovery } from "../thoughts/create";

export default function Index() {
  return <LoadModel ready={Home} />;
}

/**
 * Home is the immediate thought-entry experience. The presentation here is still
 * the shared compatibility form; only the draft lifecycle lives at this level.
 */
function Home({ model, dispatch, style: s, translate: t }: ModelLoadedProps) {
  const draft = useHomeThoughtDraft({ model, dispatch });
  return (
    <SafeAreaView testID="create-thought-screen" style={[s.view, s.p0, s.py4]}>
      <ThoughtSaveRecovery model={model} style={s} />
      {Thought.isMeaningfulSpec(draft.spec) && !draft.discarding ? (
        <TouchableOpacity testID="discard-draft" onPress={draft.discard}>
          <Text style={[s.text]}>{t("cbt_form.discard_draft")}</Text>
        </TouchableOpacity>
      ) : null}
      {draft.discarding ? (
        <View testID="discard-draft-confirmation" accessibilityRole="alert">
          <Text style={[s.text]}>{t("cbt_form.discard_draft_confirm")}</Text>
          <TouchableOpacity
            testID="discard-draft-confirm"
            onPress={draft.confirmDiscard}
          >
            <Text style={[s.text]}>{t("cbt_form.discard_draft_yes")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            testID="discard-draft-cancel"
            onPress={draft.cancelDiscard}
          >
            <Text style={[s.text]}>{t("cbt_form.discard_draft_no")}</Text>
          </TouchableOpacity>
        </View>
      ) : null}
      <CBTForm
        model={model}
        style={s}
        translate={t}
        value={draft.spec}
        onChange={draft.change}
        onSubmit={draft.submit}
      />
    </SafeAreaView>
  );
}
