import React from "react";
import { Pressable, View } from "react-native";
import {
  BottomSheet,
  Button,
  Card,
  Icon,
  Typography,
} from "@/shared/components";
import { useTranslate } from "@/i18n/use-i18n";

export function DeviceUnlockSheet(props: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  onDone: () => void;
}) {
  const t = useTranslate();
  return (
    <BottomSheet isOpen={props.isOpen} onOpenChange={props.onOpenChange}>
      <BottomSheet.Portal unstable_accessibilityContainerViewIsModal>
        <BottomSheet.Overlay />
        <BottomSheet.Content>
          <View className="gap-5 px-5 pb-8 pt-4">
            <View className="flex-row items-center justify-between">
              <BottomSheet.Title>
                {t("lock_screen.device_unlock_title")}
              </BottomSheet.Title>
              <BottomSheet.Close
                testID="device-unlock-close"
                accessibilityLabel={t("lock_screen.close")}
                className="h-11 w-11 items-center justify-center"
              >
                <Icon name="close" />
              </BottomSheet.Close>
            </View>
            <Card>
              <View className="gap-4">
                <Typography type="body">
                  {t("lock_screen.device_unlock_body")}
                </Typography>
                <Pressable
                  accessibilityRole="switch"
                  accessibilityState={{ checked: props.enabled }}
                  accessibilityLabel={t("lock_screen.device_unlock_off")}
                  onPress={() => props.onEnabledChange(!props.enabled)}
                  className="flex-row items-center justify-between rounded-xl border border-separator px-4 py-3"
                >
                  <Typography type="body">
                    {t("lock_screen.device_unlock_off")}
                  </Typography>
                  <View
                    className={`h-8 w-14 rounded-full p-1 ${
                      props.enabled ? "bg-accent" : "bg-muted"
                    }`}
                  >
                    <View
                      className={`h-6 w-6 rounded-full bg-foreground ${
                        props.enabled ? "self-end" : "self-start"
                      }`}
                    />
                  </View>
                </Pressable>
                <Button
                  title={t("lock_screen.device_unlock_done")}
                  onPress={props.onDone}
                />
              </View>
            </Card>
          </View>
        </BottomSheet.Content>
      </BottomSheet.Portal>
    </BottomSheet>
  );
}
