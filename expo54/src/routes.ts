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
export function lockSetupV2(): Href {
  return "/v2/settings/lock-setup";
}
export function exportV2(): Href {
  return "/v2/settings/export";
}
export function helpV2(): Href {
  return "/v2/help";
}
export function introV2(): Href {
  return "/v2/help/intro";
}
export function debugV2(): Href {
  return "/v2/debug";
}
