import { DebugAction } from "@/src/debug/ui/debug-action";
import { DebugScreen } from "@/src/debug/ui/debug-screen";
import { DebugSection } from "@/src/debug/ui/debug-section";
import { useRouter } from "expo-router";
import React from "react";

export default function BackupDemosIndex() {
    const router = useRouter();

    return (
        <DebugScreen
            title="Backup tools"
            description="Choose a development-only backup verification screen."
        >
            <DebugSection>
                <DebugAction
                    label="Backup feature-flag demo"
                    onPress={() =>
                        router.push("/v2/debug/demos/backup/backup-feature-flag")
                    }
                />

                <DebugAction
                    label="Archive crypto diagnostics"
                    onPress={() =>
                        router.push(
                            "/v2/debug/demos/backup/archive-crypto-diagnostics"
                        )
                    }
                />
            </DebugSection>
        </DebugScreen>
    );
}