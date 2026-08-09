import { Href } from "expo-router";
import * as Thought from "./model/thought";

export function homeV2(): Href {
  return "/v2";
}
export function settingsV2(): Href {
  return "/v2/settings";
}
export function thoughtCreateV2(): Href {
  return "/v2/thoughts/create";
}
export function thoughtListV2(): Href {
  return "/v2/thoughts";
}
export function thoughtViewV2(id: Thought.Id): Href {
  return { pathname: `/v2/thoughts/[idOrKey]`, params: { idOrKey: id } };
}
export function thoughtEditV2(id: Thought.Id, slide: Thought.SlideName): Href {
  return {
    pathname: `/v2/thoughts/[idOrKey]/edit`,
    params: { idOrKey: id, slide },
  };
}
export function lockUpdateV2(): Href {
  return "/v2/settings/lock";
}
export function backupV2(): Href {
  return "/v2/settings/data/backup";
}
export function exportV2(): Href {
  return "/v2/settings/export";
}
export function helpV2(): Href {
  return "/v2/help";
}
export function introV2(params: { onboarded?: boolean } = {}): Href {
  return {
    pathname: "/v2/help/intro",
    params: { onboarded: params.onboarded ? "1" : undefined },
  };
}
export function debugV2(): Href {
  return "/v2/debug";
}
export function generalV2(): Href {
  return "/v2/settings/general";
}
export function appearanceV2(): Href {
  return "/v2/settings/appearance";
}
export function journalV2(): Href {
  return "/v2/settings/journal";
}
export function dataV2(): Href {
  return "/v2/settings/data";
}
export function wellbeingV2(): Href {
  return "/v2/settings/wellbeing";
}
export function supportV2(): Href {
  return "/v2/settings/support";
}
export function aboutV2(): Href {
  return "/v2/settings/about";
}
