import { DebugAction } from "@/src/debug/ui/debug-action";
import { DebugScreen } from "@/src/debug/ui/debug-screen";
import { DebugSection } from "@/src/debug/ui/debug-section";
import { useDefaultStyle } from "@/src/hooks/use-style";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, Text, View } from "react-native";

type LabSection = {
  readonly title: string;
  readonly note: string;
  readonly items: readonly {
    readonly label: string;
    readonly detail?: string;
    readonly href?: "/v2/debug/lab/onboarding";
  }[];
};

const labSections: readonly LabSection[] = [
  { title: "Foundations", note: "No entries yet.", items: [] },
  { title: "Components", note: "No entries yet.", items: [] },
  {
    title: "Screens",
    note: "Prototype screens live here.",
    items: [
      {
        label: "Onboarding",
        detail: "Static onboarding prototype",
        href: "/v2/debug/lab/onboarding",
      },
    ],
  },
  { title: "Experiments", note: "No entries yet.", items: [] },
] as const;

export default function LabIndex() {
  const router = useRouter();
  const s = useDefaultStyle();
  const [open, setOpen] = React.useState<Record<string, boolean>>({
    Screens: true,
  });

  return (
    <DebugScreen
      title="UI/UX Lab"
      description="Prototype and evaluate user experiences."
    >
      {labSections.map((section) => {
        const isOpen = open[section.title] ?? false;
        return (
          <View key={section.title} style={[s.my2]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={section.title}
              onPress={() =>
                setOpen((current) => ({
                  ...current,
                  [section.title]: !isOpen,
                }))
              }
            >
              <Text style={[s.subheader, s.my2]}>
                {section.title} {isOpen ? "-" : "+"}
              </Text>
            </Pressable>

            {isOpen ? (
              <DebugSection>
                {section.items.length > 0 ? (
                  section.items.map((item) => (
                    <DebugAction
                      key={item.label}
                      label={item.label}
                      detail={item.detail}
                      onPress={() => item.href && router.push(item.href)}
                    />
                  ))
                ) : (
                  <Text style={[s.text]}>{section.note}</Text>
                )}
              </DebugSection>
            ) : null}
          </View>
        );
      })}
    </DebugScreen>
  );
}
