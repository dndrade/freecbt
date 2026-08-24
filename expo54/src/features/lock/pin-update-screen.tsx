import {
  Section,
  StandardScreen,
  backHeaderAction,
  useScreenHeader,
} from "@/shared/components";
import { PinInput } from "./ui/pin-input";
import { ModelLoadedProps } from "@/src/hooks/use-model";
import { Action } from "@/src/model";
import * as Routes from "@/src/routes";
import { Redirect, useRouter } from "expo-router";
import React, { useState } from "react";

export function PinUpdateScreen(
  props: Pick<ModelLoadedProps, "dispatch" | "translate">,
): React.ReactNode {
  const { dispatch, translate: t } = props;
  const router = useRouter();
  const [form, setForm] = useState(emptyForm());

  function onSubmit(candidate: string) {
    switch (form.status) {
      case "enter": {
        if (/^[0-9]{4}$/.test(candidate)) {
          setForm({ code: candidate, confirm: "", status: "confirm" });
        } else {
          setForm(emptyForm());
        }
        return;
      }
      case "confirm": {
        if (form.code === candidate) {
          dispatch(Action.setPincode(form.code));
          setForm({ ...emptyForm(), status: "done" });
        } else {
          setForm(emptyForm());
        }
        return;
      }
      case "done": {
        return;
      }
      default:
        throw new Error(
          `unknown lock-form status: ${form.status satisfies never}`,
        );
    }
  }

  switch (form.status) {
    case "enter": {
      return (
        <PinStep
          header={t("lock_screen.update")}
          value={form.code}
          setValue={(code) => setForm({ ...form, code })}
          onComplete={onSubmit}
          onBack={() => router.back()}
        />
      );
    }
    case "confirm": {
      return (
        <PinStep
          header={t("lock_screen.confirm")}
          value={form.confirm}
          setValue={(confirm) => setForm({ ...form, confirm })}
          onComplete={onSubmit}
          onBack={() => router.back()}
        />
      );
    }
    case "done": {
      return <Redirect href={Routes.settingsV2()} />;
    }
    default:
      throw new Error(
        `unknown lock-form status: ${form.status satisfies never}`,
      );
  }
}

interface LockUpdateForm {
  code: string;
  confirm: string;
  status: "enter" | "confirm" | "done";
}

function emptyForm(): LockUpdateForm {
  return { code: "", confirm: "", status: "enter" };
}

function PinStep(props: {
  header: string;
  value: string;
  setValue: (s: string) => void;
  onComplete: (candidate: string) => void;
  onBack: () => void;
}) {
  const { header, value, setValue, onComplete, onBack } = props;
  useScreenHeader({ title: header, leftAction: backHeaderAction(onBack) });
  return (
    <StandardScreen>
      <Section className="items-center gap-4 mt-6">
        <PinInput
          value={value}
          onChange={(v) => setValue(v.replace(/[^0-9]/g, ""))}
          onComplete={onComplete}
        />
      </Section>
    </StandardScreen>
  );
}
