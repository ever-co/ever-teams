// Hermes has no Intl.PluralRules: without it a message with a count cannot be formatted
import 'intl-pluralrules';
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
		getMessageFallback: keyPathOf
	});
	translators.set(locale, translator);
	return translator;
}

let locale: AppLocale = DEFAULT_LOCALE;
const localeListeners = new Set<() => void>();

/** Calls the listener each time the language changes; answers the function that stops it. */
export function subscribeToLocale(listener: () => void): () => void {
	localeListeners.add(listener);
	return () => {
		localeListeners.delete(listener);
	};
}

/** Sets the language of the messages from a language tag, and answers the locale it resolves to. */
export function setAppLocale(tag: string | null | undefined): AppLocale {
	const next = localeFor(tag);
	if (next === locale) {
		return locale;
	}
	locale = next;
	for (const listener of localeListeners) {
		listener();
	}
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
	const messageKey = key as TranslatorKey;
	const translator = translatorFor(locale);
	if (translator.has(messageKey)) {
		return translator(messageKey, values);
	}
	return english(messageKey, values);
}
