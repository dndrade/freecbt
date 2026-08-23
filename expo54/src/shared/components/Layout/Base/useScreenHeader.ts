import React, { useLayoutEffect } from "react";
import { useNavigation } from "expo-router";
import { HeaderAction, HeaderActionButton } from "./HeaderActionButton";
import { OverflowMenuItem, OverflowMenuTrigger } from "../../OverflowMenu";

export interface ScreenHeaderOptions {
  title?: string;
  leftAction?: HeaderAction;
  rightAction?: HeaderAction;
  rightElement?: React.ReactNode;
  overflowItems?: OverflowMenuItem[];
}

export function buildHeaderOptions(options: ScreenHeaderOptions): {
  headerTitle?: string;
  headerLeft?: () => React.ReactElement;
  headerRight?: () => React.ReactElement;
} {
  let rightNode: React.ReactNode = options.rightElement;

  if (!rightNode && options.rightAction) {
    rightNode = React.createElement(HeaderActionButton, {
      action: options.rightAction,
    });
  } else if (!rightNode && options.overflowItems?.length) {
    rightNode = React.createElement(OverflowMenuTrigger, {
      items: options.overflowItems,
    });
  }

  return {
    headerTitle: options.title,
    headerLeft: options.leftAction
      ? () =>
          React.createElement(HeaderActionButton, {
            action: options.leftAction!,
          })
      : undefined,
    headerRight: rightNode
      ? () => React.createElement(React.Fragment, null, rightNode)
      : undefined,
  };
}

export function useScreenHeader(options: ScreenHeaderOptions): void {
  const navigation = useNavigation();

  useLayoutEffect(() => {
    navigation.setOptions(buildHeaderOptions(options));
  }, [
    navigation,
    options.title,
    options.leftAction,
    options.rightAction,
    options.rightElement,
    options.overflowItems,
  ]);
}
