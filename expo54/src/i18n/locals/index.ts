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
import enCommon from "../locales/en/common.json";
import enErrors from "../locales/en/errors.json";
import enValidation from "../locales/en/validation.json";

export default {
  bg,
  de,
  en: { ...en, common: enCommon, errors: enErrors, validation: enValidation },
  es,
  fa,
  fi,
  fr,
  hi,
  it,
  ko,
  nb,
  nl,
  pl,
  "pt-PT": ptPT,
  "pt-BR": ptBR,
  ro,
  ru,
  sv,
  uk,
  "zh-Hans": zhHans,
};
