import { cn } from "heroui-native";
import { View } from "react-native";

export type IconTileColor = "pink" | "purple" | "yellow";

const backgroundClass: Record<IconTileColor, string> = {
  pink: "bg-brand-pink",
  purple: "bg-brand-purple",
  yellow: "bg-brand-yellow",
};

// icon glyphs need a concrete hex, not a CSS var, since react-native icon
// libraries take a color prop rather than reading theme classes
const iconColorHex: Record<IconTileColor, string> = {
  pink: "#ffffff",
  purple: "#ffffff",
  yellow: "#3d3212",
};

export function IconTile(props: {
  color: IconTileColor;
  children: (iconColor: string) => React.ReactNode;
  className?: string;
}) {
  const { color, children, className } = props;
  return (
    <View
      className={cn(
        "w-[34px] h-[34px] rounded-[9px] items-center justify-center flex-shrink-0",
        backgroundClass[color],
        className
      )}
    >
      {children(iconColorHex[color])}
    </View>
  );
}
