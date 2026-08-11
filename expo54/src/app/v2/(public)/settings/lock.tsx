import { Routes } from "@/src";
import { LoadModel, ModelLoadedProps } from "@/src/hooks/use-model";
import { Action } from "@/src/model";
import { PinInput, Screen, Section } from "@/src/components";
import { SettingsHeader } from "@/src/components/settings";
import { Redirect } from "expo-router";
import React, { useState } from "react";

export default function Lock(): React.JSX.Element {
  return <LoadModel ready={Ready} />;
}

interface LockUpdateForm {
  code: string;
  confirm: string;
  status: "enter" | "confirm" | "done";
}

function emptyForm(): LockUpdateForm {
  return { code: "", confirm: "", status: "enter" };
}

function Ready({ dispatch, translate: t }: ModelLoadedProps) {
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
          `unknown lock-form status: ${form.status satisfies never}`
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
        />
      );
    }
    case "done": {
      return <Redirect href={Routes.settingsV2()} />;
    }
    default:
      throw new Error(
        `unknown lock-form status: ${form.status satisfies never}`
      );
  }
}

function PinStep(props: {
  header: string;
  value: string;
  setValue: (s: string) => void;
  onComplete: (candidate: string) => void;
}) {
  const { header, value, setValue, onComplete } = props;
  return (
    <Screen>
      <SettingsHeader title={header} />
      <Section className="items-center gap-4 mt-6">
        <PinInput
          value={value}
          onChange={(v) => setValue(v.replace(/[^0-9]/g, ""))}
          onComplete={onComplete}
        />
      </Section>
    </Screen>
  );
}
