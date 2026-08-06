import { Stack } from "expo-router";
import React from "react";

export default function BackupLayout() {
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen
                name="index"
                options={{ title: "Backup tools" }}
            />
        </Stack>
    );
}