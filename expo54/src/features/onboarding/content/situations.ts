import type { Distortion } from "@/model";
import type { TranslateKey } from "@/i18n/use-i18n";

export type SituationId = "interview" | "message" | "mistake";

export interface Situation {
  id: SituationId;
  title: TranslateKey;
  detail: TranslateKey;
  autoThought: TranslateKey;
  distortionSlugs: readonly Distortion.Slug[];
  evidence: readonly TranslateKey[];
  phrases: readonly TranslateKey[];
}

const asSlug = (s: string) => s as Distortion.Slug;

export const situationIds: readonly SituationId[] = [
  "interview",
  "message",
  "mistake",
];

export const situations: Record<SituationId, Situation> = {
  interview: {
    id: "interview",
    title: "onboarding_screen.guided.situations.interview.title",
    detail: "onboarding_screen.guided.situations.interview.detail",
    autoThought:
      "onboarding_screen.guided.situations.interview.automatic_thought",
    distortionSlugs: [
      asSlug("fortune-telling"),
      asSlug("catastrophizing"),
      asSlug("labeling"),
    ],
    evidence: [
      "onboarding_screen.guided.situations.interview.evidence_1",
      "onboarding_screen.guided.situations.interview.evidence_2",
      "onboarding_screen.guided.situations.interview.evidence_3",
      "onboarding_screen.guided.situations.interview.evidence_4",
    ],
    phrases: [
      "onboarding_screen.guided.situations.interview.phrase_1",
      "onboarding_screen.guided.situations.interview.phrase_2",
      "onboarding_screen.guided.situations.interview.phrase_3",
      "onboarding_screen.guided.situations.interview.phrase_4",
    ],
  },
  message: {
    id: "message",
    title: "onboarding_screen.guided.situations.message.title",
    detail: "onboarding_screen.guided.situations.message.detail",
    autoThought:
      "onboarding_screen.guided.situations.message.automatic_thought",
    distortionSlugs: [
      asSlug("mind-reading"),
      asSlug("catastrophizing"),
      asSlug("emotional-reasoning"),
    ],
    evidence: [
      "onboarding_screen.guided.situations.message.evidence_1",
      "onboarding_screen.guided.situations.message.evidence_2",
      "onboarding_screen.guided.situations.message.evidence_3",
      "onboarding_screen.guided.situations.message.evidence_4",
    ],
    phrases: [
      "onboarding_screen.guided.situations.message.phrase_1",
      "onboarding_screen.guided.situations.message.phrase_2",
      "onboarding_screen.guided.situations.message.phrase_3",
      "onboarding_screen.guided.situations.message.phrase_4",
    ],
  },
  mistake: {
    id: "mistake",
    title: "onboarding_screen.guided.situations.mistake.title",
    detail: "onboarding_screen.guided.situations.mistake.detail",
    autoThought:
      "onboarding_screen.guided.situations.mistake.automatic_thought",
    distortionSlugs: [
      asSlug("all-or-nothing"),
      asSlug("should-statements"),
      asSlug("self-blaming"),
    ],
    evidence: [
      "onboarding_screen.guided.situations.mistake.evidence_1",
      "onboarding_screen.guided.situations.mistake.evidence_2",
      "onboarding_screen.guided.situations.mistake.evidence_3",
      "onboarding_screen.guided.situations.mistake.evidence_4",
    ],
    phrases: [
      "onboarding_screen.guided.situations.mistake.phrase_1",
      "onboarding_screen.guided.situations.mistake.phrase_2",
      "onboarding_screen.guided.situations.mistake.phrase_3",
      "onboarding_screen.guided.situations.mistake.phrase_4",
    ],
  },
};
