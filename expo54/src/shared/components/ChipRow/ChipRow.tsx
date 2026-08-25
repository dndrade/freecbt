import React from "react";
import { Pressable, ScrollView } from "react-native";
import { Typography, useThemeColor } from "heroui-native";

export interface AppChipRowProps {
  items: readonly string[];
  onPress: (item: string) => void;
  testID?: string;
}

export const ChipRow: React.FC<AppChipRowProps> = ({
  items,
  onPress,
  testID,
}) => {
  const border = useThemeColor("border");
  const surface = useThemeColor("default");

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      testID={testID}
    >
      {items.map((item) => (
        <Pressable
          key={item}
          accessibilityRole="button"
          onPress={() => onPress(item)}
          style={{
            minHeight: 48,
            paddingHorizontal: 13,
            marginRight: 8,
            borderRadius: 99,
            borderWidth: 1,
            borderColor: border,
            backgroundColor: surface,
            justifyContent: "center",
          }}
        >
          <Typography type="body-xs" style={{ fontWeight: "600" }}>
            {item}
          </Typography>
        </Pressable>
      ))}
    </ScrollView>
  );
};
