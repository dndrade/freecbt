import * as DevClient from "expo-dev-client";
import { router } from "expo-router";

export async function registerDevMenu() {
    if (!__DEV__) return;

    await DevClient.registerDevMenuItems([
        {
            name: "Encrypted backup diagnostics",
            shouldCollapse: true,
            callback: () => router.push("/v2/debug/tools/encrypted-backup"),
        },
    ]);
}