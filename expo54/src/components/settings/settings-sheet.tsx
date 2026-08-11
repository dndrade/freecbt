import { BottomSheet } from "heroui-native";
import { Href, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef } from "react";
import { View } from "react-native";

export function SettingsSheet(props: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  onClosed?: () => void;
  children: React.ReactNode;
}) {
  const { isOpen, onOpenChange, title, onClosed, children } = props;

  return (
    <BottomSheet isOpen={isOpen} onOpenChange={onOpenChange}>
      <BottomSheet.Portal>
        <BottomSheet.Overlay />
        <BottomSheet.Content onClose={onClosed}>
          <View className="px-4">
            <View className="flex-row items-center">
              <View className="min-w-11" />
              <View className="flex-1 items-center">
                <BottomSheet.Title className="text-foreground">{title}</BottomSheet.Title>
              </View>
              <BottomSheet.Close
                accessibilityLabel="Close"
                className="min-h-11 min-w-11 items-center justify-center"
              />
            </View>
            {children}
          </View>
        </BottomSheet.Content>
      </BottomSheet.Portal>
    </BottomSheet>
  );
}

export function useResetOnDismiss(isOpen: boolean, reset: () => void) {
  const resetRef = useRef(reset);
  resetRef.current = reset;
  const wasOpenRef = useRef(isOpen);

  useEffect(() => {
    if (wasOpenRef.current && !isOpen) {
      resetRef.current();
    }
    wasOpenRef.current = isOpen;
  }, [isOpen]);
}

export function useDismissThenNavigate(onOpenChange: (open: boolean) => void) {
  const router = useRouter();
  const pendingHref = useRef<Href | null>(null);

  const dismissThenNavigate = useCallback(
    (href: Href) => {
      pendingHref.current = href;
      onOpenChange(false);
    },
    [onOpenChange]
  );

  const onClosed = useCallback(() => {
    const href = pendingHref.current;
    pendingHref.current = null;
    if (href) {
      router.push(href);
    }
  }, [router]);

  return { dismissThenNavigate, onClosed };
}
