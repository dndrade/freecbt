import type { ModelLoadedProps } from "@/src/hooks/use-model";
import React from "react";
import { Typography } from "heroui-native";

export type WorkflowKeyStatus =
    | "unchecked"
    | "missing"
    | "configured";

type Props = {
    style: ModelLoadedProps["style"];
    keyStatus: WorkflowKeyStatus;
    confirmedSaved: boolean;
    readyForArchiveV3: boolean;
};

export function WorkflowStatus(props: Props) {
    const { style: s } = props;

    return (
        <>
            <Typography type="body-xs">
                Recovery key: {props.keyStatus}
            </Typography>
            <Typography type="body-xs">
                Saved confirmation:{" "}
                {props.confirmedSaved ? "confirmed" : "not confirmed"}
            </Typography>
            <Typography type="body-xs">
                Archive-v3:{" "}
                {props.readyForArchiveV3 ? "ready" : "not ready"}
            </Typography>
        </>
    );
}