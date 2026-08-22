// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");
const prettierConfig = require("eslint-config-prettier/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
    rules: {
      // often I want to declare a type and a var with the same name, don't whine about it
      // typescript already checks this one for redeclared vars
      "no-redeclare": "off",
      "@typescript-eslint/no-redeclare": "off",
    },
  },
  {
    files: ["src/model/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/src/platform/**", "**/platform/**"],
              message:
                "model/ must remain infrastructure-independent; move the contract to model/ or call platform from a feature/runtime layer.",
            },
            {
              group: [
                "@/src/features/**",
                "**/features/**",
                "@/src/app/**",
                "**/app/**",
              ],
              message:
                "model/ must not depend on features/ or app/; keep model/ as pure domain logic.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/platform/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@/src/features/**",
                "**/features/**",
                "@/src/app/**",
                "**/app/**",
              ],
              message:
                "platform/ must not depend on features/ or app/; platform is infrastructure, not a feature consumer.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/constants/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@/src/features/**",
                "**/features/**",
                "@/src/model/**",
                "**/model/**",
                "@/src/platform/**",
                "**/platform/**",
              ],
              message:
                "constants/ must stay inert (no runtime deps on features/model/platform).",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/components/**/*.{ts,tsx}"],
    ignores: ["**/*.test.ts", "**/*.test.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/src/features/**", "**/features/**"],
              message:
                "components/ is shared UI; it must not import feature-private code. Move the shared piece into components/ or hooks/ instead.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/app/**/*.{ts,tsx}"],
    ignores: ["src/app/v2/debug/**", "**/*.test.ts", "**/*.test.tsx"],
    rules: {
      "no-restricted-imports": [
        "warn",
        {
          patterns: [
            {
              group: ["@/src/features/*/ui/**", "**/features/*/ui/**"],
              message:
                "Production routes must import a feature's public entry, not feature-private UI/hooks/flags.",
            },
            {
              group: [
                "@/src/features/thoughts/use-thought-from-route",
                "**/thoughts/use-thought-from-route",
              ],
              message:
                "Production routes must import a feature's public entry, not feature-private UI/hooks/flags.",
            },
            {
              group: [
                "@/src/features/thoughts/use-home-thought-draft",
                "**/thoughts/use-home-thought-draft",
              ],
              message:
                "Production routes must import a feature's public entry, not feature-private UI/hooks/flags.",
            },
            {
              group: [
                "@/src/features/*/*-flags",
                "@/src/features/*/*-flags.ts",
                "**/features/*/*-flags",
              ],
              message:
                "Production routes must not import a feature's raw flag module directly; consume the feature's public selector instead.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/app/v2/(public)/settings/data/backup/index.tsx"],
    rules: {
      "no-restricted-imports": [
        "warn",
        {
          patterns: [
            {
              group: ["@/src/features/*/ui/**", "**/features/*/ui/**"],
              message:
                "Production routes must import a feature's public entry, not feature-private UI/hooks/flags.",
            },
            {
              group: [
                "@/src/features/thoughts/use-thought-from-route",
                "**/thoughts/use-thought-from-route",
              ],
              message:
                "Production routes must import a feature's public entry, not feature-private UI/hooks/flags.",
            },
            {
              group: [
                "@/src/features/thoughts/use-home-thought-draft",
                "**/thoughts/use-home-thought-draft",
              ],
              message:
                "Production routes must import a feature's public entry, not feature-private UI/hooks/flags.",
            },
          ],
        },
      ],
    },
  },
  prettierConfig,
]);
