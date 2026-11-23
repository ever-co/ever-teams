import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * The strings of Settings > Security > Sites you signed in from (#5595), `settings.allowedSites`, in the 13 languages
 * of the app.
 */
const LOCALES_DIRECTORY = resolve(__dirname, '../../locales');

const APP_LOCALE_FILES = ['ar', 'bg', 'de', 'en', 'es', 'fr', 'he', 'it', 'nl', 'pl', 'pt', 'ru', 'zh'].map(
	(language) => `${language}.json`
);

/** ICU arguments: `{name}`. */
const ARGUMENT_PATTERN = /\{(\w+)\}/g;
/** An apostrophe right before ICU syntax starts a quoted literal, and the message then shows its braces. */
const QUOTED_SYNTAX_PATTERN = /'[{}#]/;

type TLocaleMessages = { settings: { allowedSites: Record<string, string>; sessions: Record<string, string> } };

function messagesOf(file: string): TLocaleMessages['settings'] {
	const content = readFileSync(resolve(LOCALES_DIRECTORY, file), 'utf8');
	return (JSON.parse(content) as TLocaleMessages).settings;
}

function argumentsOf(message: string): string[] {
	const names = [...message.matchAll(ARGUMENT_PATTERN)].map((match) => match[1]);
	return [...new Set(names)].sort();
}

const localeFiles = readdirSync(LOCALES_DIRECTORY).filter((file) => file.endsWith('.json'));
const translatedLocaleFiles = localeFiles.filter((file) => file !== 'en.json');
const english = messagesOf('en.json').allowedSites;
const KEYS = Object.keys(english);

describe('translations of the sites a person signed in from', () => {
	it('covers the 13 languages of the app', () => {
		expect([...localeFiles].sort()).toEqual(APP_LOCALE_FILES);
	});

	it('names in English what each message needs', () => {
		expect(argumentsOf(english.DESCRIPTION)).toEqual(['appName']);
		expect(argumentsOf(english.RENEWS_UNTIL)).toEqual(['date']);
		expect(argumentsOf(english.END_TITLE)).toEqual(['site']);
		expect(argumentsOf(english.END_DESCRIPTION)).toEqual(['appName']);
		expect(argumentsOf(english.ENDED)).toEqual(['site']);
	});

	it.each(localeFiles)('defines every message in %s, in the English order, with the English arguments', (file) => {
		const messages = messagesOf(file).allowedSites;

		expect(Object.keys(messages)).toEqual(KEYS);
		for (const key of KEYS) {
			expect(messages[key]?.trim()).toBeTruthy();
			expect(argumentsOf(messages[key])).toEqual(argumentsOf(english[key]));
			expect(QUOTED_SYNTAX_PATTERN.test(messages[key])).toBe(false);
		}
	});

	it.each(translatedLocaleFiles)('is translated in %s', (file) => {
		const messages = messagesOf(file).allowedSites;

		for (const key of KEYS) {
			expect(messages[key]).not.toBe(english[key]);
		}
	});

	it.each(localeFiles)('offers to try again in %s with the words the sessions list uses', (file) => {
		const messages = messagesOf(file);

		expect(messages.allowedSites.RETRY).toBe(messages.sessions.RETRY);
	});
});
