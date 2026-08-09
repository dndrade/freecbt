import { Text, View } from "react-native";

export function SectionHeader(props: { label: string }) {
  return (
    <View className="flex-row items-center gap-[7px] px-1 pb-[6px]">
      <View className="w-[3px] h-[12px] bg-brand-purple rounded-sm opacity-70" />
      <Text className="text-brand-purple text-[11px] font-bold uppercase tracking-[0.7px]">
        {props.label}
      </Text>
    </View>
  );
}
