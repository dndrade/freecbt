import {
  Section,
  StandardScreen,
  Button,
  Typography,
  backHeaderAction,
  useScreenHeader,
} from "@/shared/components";
import { useTranslate } from "@/i18n/use-i18n";
import * as Routes from "@/src/routes";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { PinEntry } from "../components/PinEntry";

type Step =
  | { name: "intro" }
  | { name: "create"; error?: "mismatch" | "storage"; errorAttempt: number }
  | { name: "confirm"; code: string }
  | { name: "done" };

export function PinSetupScreen(): React.ReactNode {
  const t = useTranslate();
  const router = useRouter();
  const setPin = useAuthStore((state) => state.setPin);
  const [step, setStep] = useState<Step>({ name: "intro" });

  function onConfirmComplete(candidate: string) {
    if (step.name !== "confirm") return;
    if (candidate !== step.code) {
      setStep({ name: "create", error: "mismatch", errorAttempt: 1 });
      return;
    }

    void setPin(step.code).then(
      () => setStep({ name: "done" }),
      () =>
        setStep({
          name: "create",
          error: "storage",
          errorAttempt: 1,
        }),
    );
  }

  switch (step.name) {
    case "intro":
      return (
        <StandardScreen>
          <Section className="items-center gap-4">
            <Typography type="h2">
              {t("lock_screen.setup_intro_title")}
            </Typography>
            <Typography type="body" color="muted">
              {t("lock_screen.setup_intro_body")}
            </Typography>
            <Button
              onPress={() => setStep({ name: "create", errorAttempt: 0 })}
            >
              {t("lock_screen.setup_intro_cta")}
            </Button>
          </Section>
        </StandardScreen>
      );

    case "create":
      return (
        <PinStep
          header={t("lock_screen.setup_create_title")}
          error={
            step.error === "storage"
              ? t("lock_screen.setup_storage_error")
              : step.error === "mismatch"
                ? t("lock_screen.setup_mismatch")
                : undefined
          }
          resetKey={`create-${step.errorAttempt}`}
          onComplete={(code) => setStep({ name: "confirm", code })}
          onBack={() => router.back()}
        />
      );

    case "confirm":
      return (
        <PinStep
          header={t("lock_screen.setup_confirm_title")}
          onComplete={onConfirmComplete}
          onBack={() => router.back()}
        />
      );

    case "done":
      return (
        <StandardScreen>
          <Section className="items-center gap-4">
            <Typography type="h2">
              {t("lock_screen.setup_success_title")}
            </Typography>
            <Button onPress={() => router.replace(Routes.settingsV2())}>
              {t("lock_screen.setup_success_cta")}
            </Button>
          </Section>
        </StandardScreen>
      );
  }
}

function PinStep(props: {
  header: string;
  error?: string;
  resetKey?: string;
  onComplete: (candidate: string) => void;
  onBack: () => void;
}) {
  const { header, error, resetKey, onComplete, onBack } = props;
  useScreenHeader({ title: header, leftAction: backHeaderAction(onBack) });

  return (
    <StandardScreen>
      <Section className="items-center gap-4 mt-6">
        <PinEntry
          onComplete={onComplete}
          shake={Boolean(error)}
          resetKey={resetKey}
        />
        {error && (
          <Typography type="body-sm" className="text-danger">
            {error}
          </Typography>
        )}
      </Section>
    </StandardScreen>
  );
}
