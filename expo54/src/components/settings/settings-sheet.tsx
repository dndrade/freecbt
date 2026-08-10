import { BottomSheet } from "heroui-native";
import { Href, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef } from "react";

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
          <BottomSheet.Close />
          <BottomSheet.Title>{title}</BottomSheet.Title>
          {children}
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
