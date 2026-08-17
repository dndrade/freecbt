import { Feather } from "@expo/vector-icons";
import { Typography, useThemeColor } from "heroui-native";
import { useRouter } from "expo-router";
import { Pressable, View } from "react-native";

export function ScreenHeader(props: { title: string; showBack?: boolean }) {
  const router = useRouter();
  const accent = useThemeColor("accent");
  return (
    <View className="flex-row items-center justify-center px-2 py-2 relative">
      {props.showBack !== false && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => router.back()}
          className="absolute left-1 flex-row items-center gap-1 p-3"
        >
          <Feather name="chevron-left" size={20} color={accent} />
        </Pressable>
      )}
      <Typography.Heading type="h4">{props.title}</Typography.Heading>
    </View>
  );
}
