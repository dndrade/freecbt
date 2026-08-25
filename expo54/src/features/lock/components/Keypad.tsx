import React from "react";
import { Pressable, View } from "react-native";
import { Typography } from "@/shared/components";

const ROWS = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
];

export function Keypad(props: {
  onDigit: (digit: string) => void;
  onBackspace: () => void;
}) {
  return (
    <View className="items-center gap-4">
      {ROWS.map((row) => (
        <View key={row.join()} className="flex-row gap-6">
          {row.map((digit) => (
            <Key
              key={digit}
              testID={`keypad-digit-${digit}`}
              onPress={() => props.onDigit(digit)}
            >
              <Typography type="h2">{digit}</Typography>
            </Key>
          ))}
        </View>
      ))}
      <View className="flex-row gap-6">
        <View style={{ width: 64, height: 64 }} />
        <Key testID="keypad-digit-0" onPress={() => props.onDigit("0")}>
          <Typography type="h2">0</Typography>
        </Key>
        <Key
          testID="keypad-backspace"
          accessibilityLabel="Backspace"
          onPress={props.onBackspace}
        >
          <Typography type="h2">⌫</Typography>
        </Key>
      </View>
    </View>
  );
}

function Key(props: {
  testID: string;
  accessibilityLabel?: string;
  onPress: () => void;
  children: React.ReactNode;
}) {
  return (
    <Pressable
      testID={props.testID}
      accessibilityRole="button"
      accessibilityLabel={props.accessibilityLabel}
      onPress={props.onPress}
      style={{
        width: 64,
        height: 64,
        borderRadius: 32,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {props.children}
    </Pressable>
  );
}
