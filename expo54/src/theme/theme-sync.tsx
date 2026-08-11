import { useEffect } from "react";
import { Uniwind } from "uniwind";
import { useModel } from "@/src/hooks/use-model";
import { Model } from "@/src/model";

export function ThemeSync() {
    const [model] = useModel();
    const colorScheme = Model.colorScheme(model);

    useEffect(() => {
        Uniwind.setTheme(colorScheme);
    }, [colorScheme]);

    return null;
}
