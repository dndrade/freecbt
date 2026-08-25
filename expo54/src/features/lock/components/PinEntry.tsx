import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { Keypad } from "./Keypad";
import { PinDots } from "./PinDots";

export function PinEntry(props: {
  onComplete: (value: string) => void;
  length?: number;
  shake?: boolean;
  resetKey?: number | string;
}) {
  const { onComplete, length = 4, shake = false, resetKey } = props;
  const [value, setValue] = useState("");

  useEffect(() => setValue(""), [resetKey]);

  function onDigit(digit: string) {
    if (value.length >= length) return;
    const next = value + digit;
    setValue(next);
    if (next.length === length) onComplete(next);
  }

  return (
    <View className="items-center gap-8">
      <PinDots length={length} filled={value.length} shake={shake} />
      <Keypad
        onDigit={onDigit}
        onBackspace={() => setValue((current) => current.slice(0, -1))}
      />
    </View>
  );
}
