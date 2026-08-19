import { useEffect } from "react";
import { Uniwind } from "uniwind";
import { useModel } from "@/src/hooks/use-model";

export function ThemeSync() {
    const [model] = useModel();
    const theme =
        model.status === "ready" ? model.settings.theme ?? "system" : "system";

    useEffect(() => {
        Uniwind.setTheme(theme);
    }, [theme]);

    return null;
}
