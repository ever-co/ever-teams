import en from '../messages/en.json';
import zh from '../messages/zh.json';
import he from '../messages/he.json';
import it from '../messages/it.json';
import pl from '../messages/pl.json';
import pt from '../messages/pt.json';
import ru from '../messages/ru.json';
import es from '../messages/es.json';
import fr from '../messages/fr.json';
import ar from '../messages/ar.json';
import bg from '../messages/bg.json';
import nl from '../messages/nl.json';
import de from '../messages/de.json';

type Locale = 'en' | 'de' | 'ar' | 'bg' | 'zh' | 'nl' | 'he' | 'it' | 'pl' | 'pt' | 'ru' | 'es' | 'fr';
type EnTYPE = typeof en;
type ObjectLocale = {
	[key in Locale]: EnTYPE;
};

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
