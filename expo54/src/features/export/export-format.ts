import type { TranslateFn } from "@/src/i18n/use-i18n";
import { Thought } from "@/src/model";

export const EMPTY = "🤷";
export function toMarkdown(props: {
  thoughts: readonly Thought.Thought[];
  translate: TranslateFn;
}): string {
  const { thoughts, translate: t } = props;
  return thoughts
    .map((thought) => {
      const distortions = Thought.distortionsList(thought);
      return `\
created: ${thought.createdAt.toLocaleDateString()} ${thought.createdAt.toLocaleTimeString()}
updated: ${thought.updatedAt.toLocaleDateString()} ${thought.createdAt.toLocaleTimeString()}
id: ${thought.uuid}

## ${t("auto_thought")}

${thought.automaticThought ? escapeMarkdown(thought.automaticThought) : EMPTY}

## ${t("cog_distortion")}

${
  distortions.length > 0
    ? distortions.map((d) => `- ${t(d.labelKey)}`).join("\n")
    : EMPTY
}

## ${t("challenge")}

${thought.challenge ? escapeMarkdown(thought.challenge) : EMPTY}

## ${t("alt_thought")}

${
  thought.alternativeThought
    ? escapeMarkdown(thought.alternativeThought)
    : EMPTY
}
`;
    })
    .join("\n---\n");
}

export function escapeMarkdown(s: string): string {
  return s.replace(/([#_=`])/g, "\\$1").replace(/:FreeCBT:/g, "\\:FreeCBT\\:");
}

export function toCSV(ts: readonly Thought.Thought[]): string {
  const headers = [
    "uuid",
    "createdAt",
    "updatedAt",
    "automaticThought",
    "cognitiveDistortions",
    "challenge",
    "alternativeThought",
  ];
  const table: string[][] = [headers].concat(
    ts.map((t): string[] => {
      return [
        t.uuid,
        t.createdAt.toISOString(),
        t.updatedAt.toISOString(),
        t.automaticThought,
        Array.from(t.cognitiveDistortions)
          .map((d) => d.slug)
          .sort()
          .join(","),
        t.challenge,
        t.alternativeThought,
      ];
    })
  );
  return table.map((row) => row.map(escapeCSV).join(",")).join("\n");
}

export function escapeCSV(s: string): string {
  s = s.replace(/"/g, '""');
  if (/[,"'\n\\]/.test(s)) {
    s = `"${s}"`;
  }
  return s;
}
