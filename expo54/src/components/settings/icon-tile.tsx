import { cn } from "heroui-native";
import { useCSSVariable } from "uniwind";
import { View } from "react-native";

export type IconTileColor = "pink" | "purple" | "yellow";

const backgroundClass: Record<IconTileColor, string> = {
  pink: "bg-brand-pink",
  purple: "bg-brand-purple",
  yellow: "bg-brand-yellow",
};

export const foregroundVariable: Record<IconTileColor, string> = {
  pink: "--color-brand-pink-foreground",
  purple: "--color-brand-purple-foreground",
  yellow: "--color-brand-yellow-foreground",
};

export function IconTile(props: {
  color: IconTileColor;
  children: (iconColor: string) => React.ReactNode;
  className?: string;
}) {
  const { color, children, className } = props;
  const resolved = useCSSVariable(foregroundVariable[color]);
  const iconColor =
    typeof resolved === "string"
      ? resolved
      : typeof resolved === "number"
        ? String(resolved)
        : "invalid";

  return (
    <View
      className={cn(
        "w-[34px] h-[34px] rounded-[9px] items-center justify-center flex-shrink-0",
        backgroundClass[color],
        className
      )}
    >
      {children(iconColor)}
    </View>
  );
}
