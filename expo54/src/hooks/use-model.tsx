import { Storage } from "@/src";
import {
  Action,
  Cmd,
  Distortion,
  DistortionData,
  Model,
  Settings,
} from "@/src/model";
import AsyncStorage, {
  AsyncStorageStatic,
} from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useEffect } from "react";
import { ActivityIndicator, Appearance } from "react-native";
import { createElmArch, useElmArch } from "./use-elm-arch";
import { defaultLocale, TranslateFn, useTranslate } from "@/src/i18n/use-i18n";
import { Style, useStyle } from "./use-style";
import { getPin, removePin, setPin } from "@/features/lock/services/pinStorage";

const Ctx = createElmArch<Model.Model, Action.Action, Cmd.Cmd>();

export function ModelProvider(props: { children: React.ReactNode }) {
  const runner = useCmdRunner(DistortionData, AsyncStorage);
  return (
    <Ctx.Provider init={Model.init} update={Model.update} runner={runner}>
      {props.children}
    </Ctx.Provider>
  );
}

export function useModel() {
  return useElmArch(Ctx);
}
export function LoadModel(props: {
  loading?: () => React.JSX.Element;
  ready: ModelLoadedComponent;
}): React.ReactNode {
  const [model, dispatch] = useModel();
  const style = useStyle(Model.colorScheme(model));
  const translate = useTranslate();
  return Model.match(model, {
    loading: props.loading ?? (() => <ActivityIndicator />),
    ready: (model) => (
      <props.ready
        model={model}
        dispatch={dispatch}
        style={style}
        translate={translate}
      />
    ),
  });
}
export interface ModelLoadedProps {
  model: Model.Ready;
  dispatch: (a: Action.Action) => void;
  style: Style;
  translate: TranslateFn;
}
export type ModelLoadedComponent = (props: ModelLoadedProps) => React.ReactNode;

function useCmdRunner(data: Distortion.Data, storage: AsyncStorageStatic) {
  const s = legacySettings(storage);
  const t = Storage.thoughts(data, storage);
  const drafts = Storage.homeThoughtDraft(data, storage);
  const outbox = Storage.thoughtSaveOutbox(data, storage);
  const router = useRouter();
  // usually mutable stuff should be done with useState() in react, but here it blows up, and I couldn't solve why.
  let dispatch: (a: Action.Action) => void = () => {};

  useEffect(() => {
    const l = Appearance.addChangeListener((prefs) =>
      dispatch(Action.setDeviceColorScheme(prefs.colorScheme ?? null)),
    );
    return () => l.remove();
  }, []);

  return (d: (a: Action.Action) => void) => {
    dispatch = d;
    return async (c: Cmd.Cmd) => {
      switch (c.cmd) {
        case "load-model": {
          if (typeof window === "undefined") return; // web platform ssr + asyncstorage bugs out
          const [settings, tm, homeThoughtDraft, thoughtSaveOutbox] =
            await Promise.all([
              s.read(),
              t.readAll(),
              drafts.read(),
              outbox.readAll(),
            ]);
          const deviceLocale = defaultLocale();
          const deviceColorScheme = Appearance.getColorScheme() ?? null;
          const m = Model.ready({
            sessionAuthed: false,
            distortionData: DistortionData,
            deviceColorScheme,
            deviceLocale,
            settings,
            onboardingCompletion: "idle",
            homeThoughtDraft,
            homeThoughtDraftRevision: 0,
            homeThoughtDraftPersistence: "idle",
            thoughtSaveOutbox,
            thoughtSaveResult: "idle",
            ...tm,
          });
          dispatch(Action.modelReady(m));
          return;
        }
        case "write-settings": {
          await s.write(c.value);
          return;
        }
        case "complete-onboarding": {
          try {
            await s.write(c.value);
            dispatch(Action.onboardingCompletionSucceeded());
          } catch (error) {
            dispatch(Action.onboardingCompletionFailed(error));
          }
          return;
        }
        case "write-home-thought-draft": {
          try {
            await drafts.write(c.value);
          } catch (error) {
            dispatch(Action.homeThoughtDraftWriteFailed(error));
          }
          return;
        }
        case "clear-home-thought-draft": {
          try {
            await drafts.clear();
          } catch (error) {
            dispatch(
              c.cleanup === undefined
                ? Action.homeThoughtDraftWriteFailed(error)
                : Action.homeThoughtDraftCleanupFailed(
                    c.cleanup.record,
                    c.cleanup.outboxSubmissionId,
                    error,
                    new Date(),
                  ),
            );
          }
          return;
        }
        case "insert-thought-save-outbox": {
          try {
            await outbox.insert(c.value);
            dispatch(
              Action.thoughtSaveOutboxInsertionSucceeded(
                c.value.submissionId,
                new Date(),
              ),
            );
          } catch (error) {
            dispatch(
              Action.thoughtSaveOutboxInsertionFailed(
                c.value.submissionId,
                error,
              ),
            );
          }
          return;
        }
        case "update-thought-save-outbox": {
          try {
            await outbox.update(c.value);
            dispatch(Action.thoughtSaveOutboxUpdated(c.value));
          } catch (error) {
            // an unreported failure here is fatal to the processor: the record
            // stays `active`, which gates every later record, and no recovery
            // surface renders an `active` record. Report it as a save failure,
            // which the model turns into a recoverable `failed` record.
            dispatch(
              Action.thoughtSaveWriteFailed(
                c.value.submissionId,
                error,
                new Date(),
              ),
            );
          }
          return;
        }
        case "remove-thought-save-outbox": {
          try {
            await outbox.remove(c.value);
            dispatch(Action.thoughtSaveOutboxRemoved(c.value, new Date()));
          } catch (error) {
            dispatch(
              Action.thoughtSaveOutboxRemovalFailed(c.value, error, new Date()),
            );
          }
          return;
        }
        case "write-submitted-thought": {
          try {
            await t.persistSubmittedThought(c.submissionId, c.thought);
            dispatch(
              Action.thoughtSaveWriteSucceeded(c.submissionId, c.thought),
            );
          } catch (error) {
            dispatch(
              Action.thoughtSaveWriteFailed(c.submissionId, error, new Date()),
            );
          }
          return;
        }
        case "write-thought": {
          await t.write(c.value);
          return;
        }
        case "delete-thought": {
          await t.remove(c.value);
          return;
        }
        // TODO delete this, it's better for forms to return <Redirect href=...> when they're done
        case "navigate": {
          router.navigate(c.value);
          return;
        }
        default:
          throw new Error(`no such cmd: ${c satisfies never}`);
      }
    };
  };
}

function legacySettings(storage: AsyncStorageStatic) {
  async function read(): Promise<Settings.Settings> {
    const [batch, pincode] = await Promise.all([
      storage.multiGet(Settings.batchKeys),
      getPin(),
    ]);
    return Settings.fromJson.parse({
      ...Object.fromEntries(batch),
      [Settings.pincodeKey]: pincode,
    });
  }

  async function write(value: Settings.Settings): Promise<void> {
    const json = Settings.fromJson.encode(value);
    const { [Settings.pincodeKey]: pincode, ...rest } = json;
    const entries = Object.entries(rest);
    await Promise.all([
      storage.multiRemove(
        entries.filter(([, v]) => v === null).map(([k]) => k),
      ),
      storage.multiSet(
        entries.filter((entry): entry is [string, string] => entry[1] !== null),
      ),
      pincode === null ? removePin() : setPin(pincode),
    ]);
  }

  return { read, write };
}
