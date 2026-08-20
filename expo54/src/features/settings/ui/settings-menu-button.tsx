import { Feather } from "@expo/vector-icons";
import { Href, useRouter } from "expo-router";
import { Menu, PressableFeedback, useThemeColor } from "heroui-native";
import React, { useRef, useState } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TOP_BAR_ROW_HEIGHT } from "@/src/components/layout/top-bar";
import * as Routes from "@/src/routes";
import { ModelLoadedProps } from "@/src/hooks/use-model";
import { buildSupportPanelItems } from "../settings-panels";
import { AppearancePicker } from "./appearance-picker";
import { SettingsPanel } from "./settings-panel";

const ICON_SIZE = 20;
const TOUCH_TARGET = 44;
// Menu.Portal renders via FullWindowOverlay on Android; navigating while it's
// still unmounting races the native SafeAreaProvider child list and crashes
// (IllegalStateException: null child during dispatchGetDisplayList). Wait for
// the close animation to finish before pushing, same reasoning as
// useDismissThenNavigate in settings-sheet.tsx.
const MENU_CLOSE_ANIMATION_MS = 200;

/**
 * Floating point of entry for settings, replacing the old settings tab.
 * Rendered once as an overlay in the tabs layout, top-right of the safe area.
 */
export function SettingsMenuButton(props: ModelLoadedProps) {
  const { model, dispatch, translate: t } = props;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [muted] = useThemeColor(["muted"]);
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pendingHref = useRef<Href | null>(null);

  function handleMenuOpenChange(open: boolean) {
    setMenuOpen(open);
    if (!open && pendingHref.current) {
      const href = pendingHref.current;
      pendingHref.current = null;
      setTimeout(() => router.push(href), MENU_CLOSE_ANIMATION_MS);
    }
  }

  return (
    <>
      <View
        className="absolute right-4 items-center justify-center"
        style={{ top: insets.top + TOP_BAR_ROW_HEIGHT }}
      >
        <Menu isOpen={menuOpen} onOpenChange={handleMenuOpenChange}>
          <Menu.Trigger asChild accessibilityLabel={t("accessibility.settings_button")}>
            <PressableFeedback
              className="items-center justify-center"
              style={{ width: TOUCH_TARGET, height: TOUCH_TARGET }}
            >
              <Feather name="more-vertical" size={ICON_SIZE} color={muted} />
            </PressableFeedback>
          </Menu.Trigger>
          <Menu.Portal>
            <Menu.Overlay />
            <Menu.Content presentation="popover" placement="bottom" align="end" width={200}>
              <Menu.Item onPress={() => setAppearanceOpen(true)}>
                <Feather name="moon" size={17} color={muted} />
                <Menu.ItemTitle>{t("settings.hub.appearance.label")}</Menu.ItemTitle>
              </Menu.Item>
              <Menu.Item onPress={() => { pendingHref.current = Routes.settingsV2(); }}>
                <Feather name="settings" size={17} color={muted} />
                <Menu.ItemTitle>{t("settings.header")}</Menu.ItemTitle>
              </Menu.Item>
              <Menu.Item onPress={() => setHelpOpen(true)}>
                <Feather name="help-circle" size={17} color={muted} />
                <Menu.ItemTitle>{t("settings.hub.menu.help")}</Menu.ItemTitle>
              </Menu.Item>
            </Menu.Content>
          </Menu.Portal>
        </Menu>
      </View>

      <AppearancePicker
        isOpen={appearanceOpen}
        onOpenChange={setAppearanceOpen}
        model={model}
        dispatch={dispatch}
        translate={t}
      />
      <SettingsPanel
        isOpen={helpOpen}
        onOpenChange={setHelpOpen}
        title={t("settings.support.header")}
        items={buildSupportPanelItems(t)}
      />
    </>
  );
}
