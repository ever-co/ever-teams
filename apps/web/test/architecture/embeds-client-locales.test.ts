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

describe('translations of the client an embed credential is limited to', () => {
	it('covers the 13 languages of the app', () => {
		expect(localeFiles).toHaveLength(13);
	});

	it.each(localeFiles)('says everything the field and the list show in %s, with the client named', (file) => {
		const messages = embedsMessagesOf(file);

		for (const key of CLIENT_KEYS) {
			expect(messages[key]?.trim()).toBeTruthy();
		}
		expect(messages.LIMITED_TO_CLIENT).toContain('{client}');
	});

	it.each(translatedLocaleFiles)('says it in the language of %s', (file) => {
		const messages = embedsMessagesOf(file);
		const translatedKeys = CLIENT_KEYS.filter((key) => !SAME_IN_SOME_LANGUAGES.has(key));

		for (const key of translatedKeys) {
			expect(messages[key]).not.toBe(english[key]);
		}
	});
});
