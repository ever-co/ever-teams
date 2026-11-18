import ar from '../../locales/ar.json';
import bg from '../../locales/bg.json';
import en from '../../locales/en.json';
import es from '../../locales/es.json';
import fr from '../../locales/fr.json';
import he from '../../locales/he.json';
import ko from '../../locales/ko.json';
import ru from '../../locales/ru.json';

export type Messages = typeof en;

export const SUPPORTED_LOCALES = ['ar', 'bg', 'en', 'es', 'fr', 'he', 'ko', 'ru'] as const;

export type AppLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: AppLocale = 'en';

export const messagesByLocale: Record<AppLocale, Messages> = { ar, bg, en, es, fr, he, ko, ru };

function isAppLocale(value: string): value is AppLocale {
	return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

/** The app's locale for a language tag: 'fr-FR' gives French, a language the app does not have gives English. */
export function localeFor(tag: string | null | undefined): AppLocale {
	const language = (tag ?? '').split(/[-_]/)[0].toLowerCase();
	if (isAppLocale(language)) {
		return language;
	}
	return DEFAULT_LOCALE;
}
