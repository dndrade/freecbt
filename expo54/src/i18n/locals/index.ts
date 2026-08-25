// a list of every available FreeCBT language. Add new ones to the list below. Alphabetical order, please. Thanks!
import bg from "./bg.json";
import de from "./de.json";
import en from "./en.json";
import es from "./es.json";
import fa from "./fa.json";
import fi from "./fi.json";
import fr from "./fr.json";
import hi from "./hi.json";
import it from "./it.json";
import ko from "./ko.json";
import nb from "./nb.json";
import nl from "./nl_NL.json";
import pl from "./pl.json";
import ptBR from "./pt-br.json";
import ptPT from "./pt-pt.json";
import ro from "./ro.json";
import ru from "./ru.json";
import sv from "./sv.json";
import uk from "./uk.json";
import zhHans from "./zh-Hans.json";
import bgLock from "../locales/bg/lock.json";
import deLock from "../locales/de/lock.json";
import enCommon from "../locales/en/common.json";
import enErrors from "../locales/en/errors.json";
import enLock from "../locales/en/lock.json";
import enReminders from "../locales/en/reminders.json";
import enValidation from "../locales/en/validation.json";
import faLock from "../locales/fa/lock.json";
import hiLock from "../locales/hi/lock.json";
import nbLock from "../locales/nb/lock.json";
import ptPTLock from "../locales/pt-pt/lock.json";
import ruLock from "../locales/ru/lock.json";
import ukLock from "../locales/uk/lock.json";

export default {
  bg: { ...bg, ...bgLock, settings: { ...bg.settings, ...bgLock.settings } },
  de: { ...de, ...deLock, settings: { ...de.settings, ...deLock.settings } },
  en: {
    ...en,
    ...enLock,
    ...enReminders,
    onboarding_screen: {
      ...en.onboarding_screen,
      ...enReminders.onboarding_screen,
    },
    settings: {
      ...en.settings,
      ...enLock.settings,
      ...enReminders.settings,
    },
    common: enCommon,
    errors: enErrors,
    validation: enValidation,
  },
  es,
  fa: { ...fa, ...faLock, settings: { ...fa.settings, ...faLock.settings } },
  fi,
  fr,
  hi: { ...hi, ...hiLock, settings: { ...hi.settings, ...hiLock.settings } },
  it,
  ko,
  nb: { ...nb, ...nbLock, settings: { ...nb.settings, ...nbLock.settings } },
  nl,
  pl,
  "pt-PT": {
    ...ptPT,
    ...ptPTLock,
    settings: { ...ptPT.settings, ...ptPTLock.settings },
  },
  "pt-BR": ptBR,
  ro,
  ru: { ...ru, ...ruLock, settings: { ...ru.settings, ...ruLock.settings } },
  sv,
  uk: { ...uk, ...ukLock, settings: { ...uk.settings, ...ukLock.settings } },
  "zh-Hans": zhHans,
};
