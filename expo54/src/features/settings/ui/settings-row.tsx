import { cn, ListGroup, PressableFeedback, Switch, Typography } from "heroui-native";
import { Feather } from "@expo/vector-icons";
import { View } from "react-native";
import { IconTile, type IconTileTone } from "./icon-tile";

interface BaseRowProps {
  iconName: React.ComponentProps<typeof Feather>["name"];
  tone?: IconTileTone;
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
  const { iconName, tone = "accent", label, description, className } = props;
  const accessibilityLabel =
    props.type === "value"
      ? [label, props.value].filter(Boolean).join(", ")
      : label ?? description ?? "Settings row";

  const row = (
    <ListGroup.Item className={cn(className)}>
      <View className="flex-row items-center gap-3">
        <ListGroup.ItemPrefix>
          <IconTile tone={tone}>
            {(color) => <Feather name={iconName} size={17} color={color} />}
          </IconTile>
        </ListGroup.ItemPrefix>

        <ListGroup.ItemContent className="flex-1 gap-1">
          {props.type === "collapsed" ? (
            <Typography type="body-sm" color="muted" numberOfLines={1}>
              {description}
            </Typography>
          ) : (
            <>
              {label ? (
                <ListGroup.ItemTitle>{label}</ListGroup.ItemTitle>
              ) : null}
              {description ? (
                <ListGroup.ItemDescription>{description}</ListGroup.ItemDescription>
              ) : null}
            </>
          )}
        </ListGroup.ItemContent>

        {props.type === "toggle" ? (
          <Switch
            isSelected={props.isSelected}
            onSelectedChange={props.onSelectedChange}
            pointerEvents="none"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            <Switch.Thumb />
          </Switch>
        ) : props.type === "value" ? (
          <View className="flex-row items-center gap-1">
            <Typography type="body-sm" color="muted">
              {props.value}
            </Typography>
            <ListGroup.ItemSuffix />
          </View>
        ) : (
          <ListGroup.ItemSuffix />
        )}
      </View>
    </ListGroup.Item>
  );

  if (props.type === "toggle") {
    return (
      <PressableFeedback
        asChild
        accessibilityRole="switch"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ checked: props.isSelected }}
        onPress={() => props.onSelectedChange(!props.isSelected)}
        className="px-4 py-3"
      >
        {row}
      </PressableFeedback>
    );
  }

  return (
    <PressableFeedback
      asChild
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={props.onPress}
      className="px-4 py-3"
    >
      {row}
    </PressableFeedback>
  );
}
