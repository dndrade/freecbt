import {
  Section,
  StandardScreen,
  backHeaderAction,
  useScreenHeader,
} from "@/shared/components";
import { useTranslate } from "@/i18n/use-i18n";
import { PinInput } from "./ui/pin-input";
import * as Routes from "@/src/routes";
import { Redirect, useRouter } from "expo-router";
import React, { useState } from "react";
import { setPin } from "./services/pinStorage";

export function PinUpdateScreen(): React.ReactNode {
  const t = useTranslate();
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
          void setPin(form.code).then(
            () => setForm({ ...emptyForm(), status: "done" }),
            () => setForm(emptyForm()),
          );
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
