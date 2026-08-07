import type { ModelLoadedProps } from "@/src/hooks/use-model";
import React from "react";
import { Text } from "react-native";

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
            <Text style={[s.text]}>
                Recovery key: {props.keyStatus}
            </Text>
            <Text style={[s.text]}>
                Saved confirmation:{" "}
                {props.confirmedSaved ? "confirmed" : "not confirmed"}
            </Text>
            <Text style={[s.text]}>
                Archive-v3:{" "}
                {props.readyForArchiveV3 ? "ready" : "not ready"}
            </Text>
        </>
    );
}