import { View } from "react-native";
import { Typography } from "heroui-native";
import { Style } from "../hooks/use-style";

export type KVTableEntry = readonly [string, string | React.JSX.Element];
export function KVTable(props: {
  entries: readonly KVTableEntry[];
  style: Style;
}) {
  const { entries, style: s } = props;
  const cell = [s.border, s.p1];
  return (
    <View style={[s.flexCol]}>
      {entries.map(([k, v]) => (
        <View key={k} style={[s.flexRow]}>
          <Typography type="body-xs" style={{ flex: 1, textAlign: 'right' }}>{k}</Typography>
          {typeof v === "string" ? (
            <Typography type="body-xs" style={{ flex: 3 }}>{v}</Typography>
          ) : (
            <View style={[cell, { flex: 3 }]}>{v}</View>
          )}
        </View>
      ))}
    </View>
  );
}
