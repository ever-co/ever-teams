import { createTranslator } from 'use-intl/core';
import type { TxKeyPath } from './i18n';
import { DEFAULT_LOCALE, localeFor, messagesByLocale } from './messages';
import type { AppLocale } from './messages';

/** The values of a message's placeholders: `translate('timer.startMove.saved', { time })`. */
export type TranslateValues = Record<string, string | number | Date>;

interface MissingMessage {
	key: string;
	namespace?: string;
}

function keyPathOf({ key, namespace }: MissingMessage): string {
	if (namespace) {
		return `${namespace}.${key}`;
	}
	return key;
}

// A message a locale misses is shown in English (below), as i18n-js did; the locale test keeps them complete
function ignoreMissingMessage(): void {
	return undefined;
}

const english = createTranslator({
	locale: DEFAULT_LOCALE,
	messages: messagesByLocale[DEFAULT_LOCALE],
	onError: ignoreMissingMessage,
	getMessageFallback: keyPathOf
});

type Translator = typeof english;
type TranslatorKey = Parameters<Translator>[0];

function inEnglish(missing: MissingMessage): string {
	return english(keyPathOf(missing) as TranslatorKey);
}

const translators = new Map<AppLocale, Translator>([[DEFAULT_LOCALE, english]]);

function translatorFor(locale: AppLocale): Translator {
	const known = translators.get(locale);
	if (known) {
		return known;
	}
	const translator = createTranslator({
		locale,
		messages: messagesByLocale[locale],
		onError: ignoreMissingMessage,
		getMessageFallback: inEnglish
	});
	translators.set(locale, translator);
	return translator;
}

let locale: AppLocale = DEFAULT_LOCALE;

/** Sets the language of the messages from a language tag, and answers the locale it resolves to. */
export function setAppLocale(tag: string | null | undefined): AppLocale {
	locale = localeFor(tag);
	return locale;
}

export function currentLocale(): AppLocale {
	return locale;
}

/**
 * The message of a key in the current language, with its placeholders filled.
 *
 * @example translate('timer.startMove.startedAt', { time: '09:30' }) // "Started at 09:30"
 */
export function translate(key: TxKeyPath, values?: TranslateValues): string {
	return translatorFor(locale)(key as TranslatorKey, values);
}
