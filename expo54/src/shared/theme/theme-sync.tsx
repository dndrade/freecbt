import { useEffect } from "react";
import { Uniwind } from "uniwind";
import { useSettings } from "@/features/settings/hooks/useSettings";

export function ThemeSync() {
  const theme = useSettings((state) => state.settings.theme) ?? "system";

  useEffect(() => {
    Uniwind.setTheme(theme);
  }, [theme]);

  return null;
}
