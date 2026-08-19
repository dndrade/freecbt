import { cn, useThemeColor } from "heroui-native";
import type { PropsWithChildren, ReactNode } from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type ScreenProps = PropsWithChildren<{
  scroll?: boolean;
  className?: string;
  contentClassName?: string;
  testID?: string;
  /**
   * Content pinned below the scrollable/static body, outside the scroll
   * viewport. Gets deliberate safe-bottom clearance (beyond the SafeAreaView
   * inset) so an anchored CTA never sits flush against the edge - every
   * screen that needs a fixed footer should use this instead of hand-rolling
   * its own bottom padding.
   */
  footer?: ReactNode;
}>;

export function Screen({
  children,
  scroll = true,
  className,
  contentClassName,
  testID,
  footer,
}: ScreenProps) {
  const background = useThemeColor("background");
  const content = (
    <View
      className={cn("w-full max-w-3xl self-center px-4 py-4", contentClassName)}
    >
      {children}
    </View>
  );

  return (
    <SafeAreaView
      testID={testID}
      className={cn("flex-1", className)}
      style={{ flex: 1, backgroundColor: background }}
    >
      {scroll ? (
        <ScrollView contentContainerClassName="grow">{content}</ScrollView>
      ) : (
        content
      )}
      {footer ? (
        <View className="w-full max-w-3xl self-center px-4 pb-6">{footer}</View>
      ) : null}
    </SafeAreaView>
  );
}
