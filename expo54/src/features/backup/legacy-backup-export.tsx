import { Archive, Model } from "@/src/model";
import { DownloadOrShareLink } from "@/src/platform/sharing/download-or-share";
import {
    BACKUP_EXPORT_FILENAME,
    BACKUP_EXPORT_MIME_TYPE,
} from "@/src/platform/sharing/backup-mime";
import React from "react";
import { TouchableOpacity } from "react-native";
import { Typography } from "heroui-native";
import type { BackupExportControlProps } from "./backup-control-contract";

export function LegacyBackupExport(props: BackupExportControlProps) {
    const { model, style: s, translate: t } = props;
    const parser = Archive.createParsers(model.distortionData);

    function encodeArchive(): string {
        return parser.fromString.encode(Model.toArchive(model));
    }

    return (
        <DownloadOrShareLink
            name={BACKUP_EXPORT_FILENAME}
            body={encodeArchive}
            type={BACKUP_EXPORT_MIME_TYPE}
            UTI="org.erosson.freecbt.backup"
            translate={t}
            error={(error) => <Typography type="body-sm" color="danger">{error}</Typography>}
            share={(onPress) => (
                <TouchableOpacity style={[s.button, s.my2]} onPress={onPress}>
                    <Typography type="body-sm">
                        {t("backup_screen.export.share.button")}
                    </Typography>
                </TouchableOpacity>
            )}
            download={() => (
                <TouchableOpacity style={[s.button, s.my2]}>
                    <Typography type="body-sm">
                        {t("backup_screen.export.file.button")}
                    </Typography>
                </TouchableOpacity>
            )}
        />
    );
}