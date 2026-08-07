import type { ModelLoadedProps } from "@/src/hooks/use-model";
import React from "react";
import { Text } from "react-native";

type Props = {
    style: ModelLoadedProps["style"];
    recoveryKey: string | null;
};

export function RecoveryKeyDisplay(props: Props) {
    const { style: s, recoveryKey } = props;

    if (!recoveryKey) {
        return (
            <Text style={[s.text]}>
                The recovery key is not currently revealed.
            </Text>
        );
    }

    return (
        <>
            <Text style={[s.text]}>Recovery key</Text>
            <Text selectable style={[s.text, s.my2]}>
                {recoveryKey}
            </Text>
            <Text style={[s.text]}>
                Save this value outside FreeCBT before continuing.
            </Text>
        </>
    );
}