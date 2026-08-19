import { ImagePath, PinInput, Screen, Section } from "@/src/components";
import { LoadModel, ModelLoadedProps } from "@/src/hooks/use-model";
import { Action } from "@/src/model";
import { Button, Typography } from "heroui-native";
import React, { useEffect, useState } from "react";
import { AppState, Image } from "react-native";

export function AuthGateway(props: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <LoadModel
      ready={(lprops) => <AuthReady {...lprops}>{props.children}</AuthReady>}
    />
  );
}

function AuthReady(props: ModelLoadedProps & { children: React.ReactNode }) {
  const { model, dispatch, translate: t } = props;
  const [value, setValue] = useState<string>("");

  function trySubmit(candidate: string) {
    // reset text entry. this won't matter if auth succeeds
    setValue("");
    if (candidate === model.settings.pincode) {
      dispatch(Action.setSessionAuthed(true));
    }
  }

  // remove auth if the app is in the background, because it's easy to not close it all the way
  useEffect(() => {
    AppState.addEventListener("change", (st) => {
      if (st !== "active") {
        dispatch(Action.setSessionAuthed(false));
      }
    });
  });

  if (model.settings.pincode === null || model.sessionAuthed) {
    return props.children;
  }

  return (
    <Screen>
      <Section className="items-center gap-4">
        <Image source={ImagePath.logo} className="h-8" resizeMode="contain" />
        <Image
          source={ImagePath.lockIllustration}
          className="h-48 w-48"
          resizeMode="contain"
        />
        <Typography type="h2">{t("lock_screen.gate_title")}</Typography>
        <Typography type="body" color="muted">
          {t("lock_screen.gate_subtitle")}
        </Typography>
        <PinInput
          value={value}
          onChange={(v) => setValue(v.replace(/[^0-9]/g, ""))}
          onComplete={trySubmit}
          autoFocus
        />
        <Button onPress={() => trySubmit(value)}>
          {t("lock_screen.unlock_button")}
        </Button>
        <Typography type="body-sm" className="text-accent">
          {t("lock_screen.forgot_pin")}
        </Typography>
        <Section className="bg-surface-secondary rounded-lg p-3">
          <Typography type="body-xs" color="muted">
            {t("lock_screen.reset_warning")}
          </Typography>
        </Section>
      </Section>
    </Screen>
  );
}
