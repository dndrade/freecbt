import { cn, Switch } from "heroui-native";
import { Feather } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import { IconTile, type IconTileColor } from "./icon-tile";

interface BaseRowProps {
  iconName: React.ComponentProps<typeof Feather>["name"];
  iconColor: IconTileColor;
  label?: string;
  description?: string;
  className?: string;
}

interface ToggleRowProps extends BaseRowProps {
  type: "toggle";
  isSelected: boolean;
  onSelectedChange: (v: boolean) => void;
}

interface ValueRowProps extends BaseRowProps {
  type: "value";
  value: string;
  // optional: rows wrapped in <Link asChild> get their press handling from
  // the Link, which overwrites whatever onPress this component receives
  onPress?: () => void;
}

interface NavRowProps extends BaseRowProps {
  type: "nav";
  onPress?: () => void;
}

interface CollapsedRowProps extends BaseRowProps {
  type: "collapsed";
  onPress?: () => void;
}

export type SettingsRowProps =
  | ToggleRowProps
  | ValueRowProps
  | NavRowProps
  | CollapsedRowProps;

export function SettingsRow(props: SettingsRowProps) {
  const { iconName, iconColor, label, description, className } = props;

  // border-between-rows comes from the parent SettingsCard's `divide-y`,
  // not from this component — it has no concept of its own position in the list
  const content = (
    <View className={cn("flex-row items-center gap-3 px-[14px] py-[13px]", className)}>
      <IconTile color={iconColor}>
        {(color) => <Feather name={iconName} size={17} color={color} />}
      </IconTile>

      <View className="flex-1">
        {props.type === "collapsed" ? (
          <Text className="text-muted text-[13px]" numberOfLines={1}>
            {description}
          </Text>
        ) : (
          <>
            {label && <Text className="text-foreground text-[15px]">{label}</Text>}
            {description && (
              <Text className="text-muted text-[11px] mt-[1px]">{description}</Text>
            )}
          </>
        )}
      </View>

      {props.type === "toggle" && (
        <Switch
          isSelected={props.isSelected}
          onSelectedChange={props.onSelectedChange}
          accessibilityLabel={label}
        >
          <Switch.Thumb />
        </Switch>
      )}

      {props.type === "value" && (
        <View className="flex-row items-center gap-[5px]">
          <Text className="text-muted text-[14px]">{props.value}</Text>
          <Feather name="chevron-right" size={14} color="#bbbbbb" />
        </View>
      )}

      {(props.type === "nav" || props.type === "collapsed") && (
        <Feather name="chevron-right" size={14} color="#bbbbbb" />
      )}
    </View>
  );

  if (props.type === "toggle") {
    return content;
  }

  return (
    <Pressable
      onPress={props.onPress}
      accessibilityRole="button"
      accessibilityLabel={label ?? description}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      {content}
    </Pressable>
  );
}
