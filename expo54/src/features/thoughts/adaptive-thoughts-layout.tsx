import React from "react";
import { LayoutChangeEvent, View } from "react-native";

const MIN_LIST_WIDTH = 320;
const MIN_DETAIL_WIDTH = 420;
const PANE_GAP = 16;

type Props = {
  list: React.ReactNode;
  detail: React.ReactNode;
  selectedId: string | null;
};

export function AdaptiveThoughtsLayout({ list, detail, selectedId }: Props) {
  const [width, setWidth] = React.useState(0);
  const canShowBoth = width >= MIN_LIST_WIDTH + MIN_DETAIL_WIDTH + PANE_GAP;
  const onLayout = (event: LayoutChangeEvent) => {
    setWidth(event.nativeEvent.layout.width);
  };

  return (
    <View
      testID="adaptive-thoughts-layout"
      onLayout={onLayout}
      className="flex-1"
    >
      {!selectedId ? (
        list
      ) : canShowBoth ? (
        <View className="flex-1 flex-row gap-4">
          <View style={{ minWidth: MIN_LIST_WIDTH, maxWidth: 420, flex: 0.42 }}>
            {list}
          </View>
          <View style={{ minWidth: MIN_DETAIL_WIDTH, flex: 1 }}>{detail}</View>
        </View>
      ) : (
        detail
      )}
    </View>
  );
}
