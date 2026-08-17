import { DebugAction } from "@/src/debug/ui/debug-action";
import { DebugScreen } from "@/src/debug/ui/debug-screen";
import { DebugSection } from "@/src/debug/ui/debug-section";
import { groupLabCatalog, labCatalog } from "@/src/debug/lab/catalog";
import { useDefaultStyle } from "@/src/hooks/use-style";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, Text, View } from "react-native";

const labGroups = groupLabCatalog(labCatalog);

export default function LabIndex() {
  const router = useRouter();
  const s = useDefaultStyle();
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});

  return (
    <DebugScreen
      title="UI/UX Lab"
      description="Prototype and evaluate user experiences."
    >
      {labGroups.map((section) => {
        const isOpen = !collapsed[section.group];

        return (
          <View key={section.group} style={[s.my2]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={section.group}
              onPress={() =>
                setCollapsed((current) => ({
                  ...current,
                  [section.group]: isOpen,
                }))
              }
            >
              <Text style={[s.subheader, s.my2]}>
                {section.group} {isOpen ? "-" : "+"}
              </Text>
            </Pressable>

            {isOpen ? (
              <DebugSection>
                {section.items.map((item) => (
                  <DebugAction
                    key={item.id}
                    label={item.title}
                    detail={item.description}
                    onPress={() => router.push(item.href)}
                  />
                ))}
              </DebugSection>
            ) : null}
          </View>
        );
      })}
    </DebugScreen>
  );
}
