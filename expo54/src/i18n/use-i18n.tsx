import * as Localization from "expo-localization";
import { I18n, type TranslateOptions } from "i18n-js";
import { createContext, useContext } from "react";
import { z } from "zod";
import locals0 from "./locals";
import en from "./locals/en.json";

// Type-safe, autocompletable translation keys!
export function useTranslate() {
  const i18n = useI18n();
  return (k: TranslateKey, values?: TranslateOptions) => i18n.t(k, values);
}
export type TranslateFn = ReturnType<typeof useTranslate>;

export function I18nProvider(props: {
  locale: LocaleTag;
  children: React.ReactNode;
}) {
  const i18n = new I18n(locals);
  i18n.enableFallback = true;
  i18n.locale = props.locale;

  return <Ctx value={i18n}>{props.children}</Ctx>;
}

export function useI18n(): I18n {
  const l = useContext(Ctx);
  if (l === null) {
    throw new Error("You must use <I18nProvider> before useI18n()");
  }
  return l;
}

const locals = {
  ...locals0,
  // testing with an obviously-transformed language makes it easy to find and
  // remove hardcoded strings. Hidden behind `feature.testLocalesVisible`.
  _test: walkReverse(locals0.en),
};
export type LocaleTag = keyof typeof locals;
export const localeTags = Object.keys(locals).sort() as readonly LocaleTag[];
export const LocaleTag = z.union(localeTags.map((name) => z.literal(name)));

const Ctx = createContext<I18n | null>(null);

/**
 * Create a copy of a language with all text reversed.
 */
function walkReverse<T extends object>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).map(([key, val]) => [
      key,
      typeof val === "string"
        ? val.split("").reverse().join("")
        : walkReverse(val),
    ])
  ) as T;
}

export function defaultLocale(): LocaleTag {
  // use one of the user's preferred locale by default
  for (const loc of Localization.getLocales()) {
    // languageTag is always region-qualified (e.g. "en-US"), but most of our
    // locale keys are bare language codes (e.g. "en"), so try an exact match
    // first (this also lets region-specific keys like "pt-BR"/"pt-PT" win
    // over each other), then fall back to matching by bare language code.
    // Falling through to the next preferred locale on a failed exact match
    // let a later, region-tagged locale (frequently Portuguese) outrank the
    // user's actual top preference.
    const exact = LocaleTag.safeParse(loc.languageTag);
    if (exact.success) {
      return exact.data;
    }

    if (loc.languageCode !== null) {
      const byLanguage = LocaleTag.safeParse(loc.languageCode);
      if (byLanguage.success) {
        return byLanguage.data;
      }
    }
  }
  // if the user prefers none of our translated languages, give up and default to english
  return "en";
}

// json {"a": {"b": "c", "d": "e"}} -> type "a.b" | "a.d"
// stolen from https://www.raygesualdo.com/posts/flattening-object-keys-with-typescript-types/
type FlattenKeys<
  T extends Record<string, unknown>,
  Key = keyof T
> = Key extends string
  ? T[Key] extends Record<string, unknown>
    ? `${Key}.${FlattenKeys<T[Key]>}`
    : `${Key}`
  : never;
export type TranslateKey = FlattenKeys<typeof en>;

type TranslateJson = { [k: string]: string | TranslateJson };
function flattenKeys(o: TranslateJson): { [k: string]: string } {
  return Object.fromEntries(
    Object.entries(o).flatMap(([k, v]) =>
      typeof v === "string"
        ? [[k, v]]
        : Object.entries(flattenKeys(v)).map(([k2, v2]) => [`${k}.${k2}`, v2])
    )
  );
}
export const translateKeys = Object.keys(
  flattenKeys(en)
) as readonly TranslateKey[];
export const translateKeySet = new Set<string>(translateKeys);
