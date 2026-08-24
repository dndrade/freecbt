import type { ModelLoadedProps } from "@/src/hooks/use-model";
import React from "react";
import { Typography } from "heroui-native";

type Props = {
    style: ModelLoadedProps["style"];
    recoveryKey: string | null;
};

export function RecoveryKeyDisplay(props: Props) {
    const { style: s, recoveryKey } = props;

    if (!recoveryKey) {
        return (
            <Typography type="body-sm">
                The recovery key is not currently revealed.
            </Typography>
        );
    }

    return (
        <>
            <Typography type="body-sm">Recovery key</Typography>
            <Typography type="body-sm" selectable className="my-2">
                {recoveryKey}
            </Typography>
            <Typography type="body-sm">
                Save this value outside FreeCBT before continuing.
            </Typography>
        </>
    );
}