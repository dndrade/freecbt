import type { ModelLoadedProps } from "@/src/hooks/use-model";

export type BackupExportControlProps = Pick<
    ModelLoadedProps,
    "model" | "style" | "translate"
>;

export type BackupImportControlProps = Pick<
    ModelLoadedProps,
    "model" | "dispatch" | "style" | "translate"
>;