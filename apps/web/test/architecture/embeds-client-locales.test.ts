import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const LOCALES_DIRECTORY = resolve(__dirname, '../../locales');

/** The strings of the client an embed credential is limited to: the create dialog's field and the list (#5495). */
const CLIENT_KEYS = [
	'CLIENT_LABEL',
	'CLIENT_WHOLE_WORKSPACE',
	'CLIENT_HINT',
	'CLIENT_LOADING',
	'CLIENT_EMPTY',
	'CLIENT_FAILED',
	'LIMITED_TO_CLIENT',
	'LIMITED_TO_ONE_CLIENT'
] as const;

/** The strings of a credential that adds the people it signs in: the dialog's option and the list (#5511). */
const ADD_MEMBERS_KEYS = ['ADD_MEMBERS_LABEL', 'ADD_MEMBERS_HINT', 'ADD_MEMBERS_FAILED', 'ADDS_MEMBERS'] as const;

const OPTION_KEYS = [...CLIENT_KEYS, ...ADD_MEMBERS_KEYS];

/** The 13 languages of the app, by file: a renamed or missing one fails, not only a count that changed. */
const APP_LOCALE_FILES = ['ar', 'bg', 'de', 'en', 'es', 'fr', 'he', 'it', 'nl', 'pl', 'pt', 'ru', 'zh'].map(
	(language) => `${language}.json`
);

/** "Client" is also the French word. */
const SAME_IN_SOME_LANGUAGES = new Set<string>(['CLIENT_LABEL']);

type TLocaleMessages = { settings: { embeds: Record<string, string> } };

function embedsMessagesOf(file: string): Record<string, string> {
	const content = readFileSync(resolve(LOCALES_DIRECTORY, file), 'utf8');
	const messages = JSON.parse(content) as TLocaleMessages;
	return messages.settings.embeds;
}

const localeFiles = readdirSync(LOCALES_DIRECTORY).filter((file) => file.endsWith('.json'));
const translatedLocaleFiles = localeFiles.filter((file) => file !== 'en.json');
const english = embedsMessagesOf('en.json');

describe('translations of the client an embed credential is limited to, and of the members it adds', () => {
	it('covers the 13 languages of the app', () => {
		expect([...localeFiles].sort()).toEqual(APP_LOCALE_FILES);
	});

	it.each(localeFiles)('says everything the fields and the list show in %s, with the client named', (file) => {
		const messages = embedsMessagesOf(file);

		for (const key of OPTION_KEYS) {
			expect(messages[key]?.trim()).toBeTruthy();
		}
		expect(messages.LIMITED_TO_CLIENT).toContain('{client}');
	});

	it.each(translatedLocaleFiles)('says it in the language of %s', (file) => {
		const messages = embedsMessagesOf(file);
		const translatedKeys = OPTION_KEYS.filter((key) => !SAME_IN_SOME_LANGUAGES.has(key));

		for (const key of translatedKeys) {
			expect(messages[key]).not.toBe(english[key]);
		}
	});
});
