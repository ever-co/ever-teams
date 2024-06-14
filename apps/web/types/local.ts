import en from '../locales/en.json';
import zh from '../locales/zh.json';
import he from '../locales/he.json';
import it from '../locales/it.json';
import pl from '../locales/pl.json';
import pt from '../locales/pt.json';
import ru from '../locales/ru.json';
import es from '../locales/es.json';
import fr from '../locales/fr.json';
import ar from '../locales/ar.json';
import bg from '../locales/bg.json';
import nl from '../locales/nl.json';
import de from '../locales/de.json';

type Locale = 'en' | 'de' | 'ar' | 'bg' | 'zh' | 'nl' | 'he' | 'it' | 'pl' | 'pt' | 'ru' | 'es' | 'fr';
type EnTYPE = typeof en;
type ObjectLocale = {
	[key in Locale]: EnTYPE;
};
// it will throw error if the en.json is not the same as the other json files
export const ObjectTypes: ObjectLocale = {
	en,
	de,
	ar,
	bg,
	zh,
	nl,
	he,
	it,
	pl,
	pt,
	ru,
	es,
	fr
};
