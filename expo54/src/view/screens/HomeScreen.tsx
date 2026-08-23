import { Routes } from "@/src";
import { useTranslate } from "@/i18n/use-i18n";
import { StandardScreen } from "@/shared/components";
import { useRouter } from "expo-router";
import { Button } from "heroui-native";

export function HomeScreen() {
  const t = useTranslate();
  const router = useRouter();

  return (
    <StandardScreen scrollable={false} contentClassName="flex-1">
      <Button
        testID="home-new-thought"
        onPress={() => router.push(Routes.thoughtCreateV2())}
      >
        {t("cbt_form.new_thought")}
      </Button>
    </StandardScreen>
  );
}
