import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const LOCALES_DIRECTORY = resolve(__dirname, '../../locales');
/** ICU arguments: `{name}` and the counted argument of a plural, `{count, plural, ...}`. */
const ARGUMENT_PATTERN = /\{(\w+)[,}]/g;
/** An apostrophe right before ICU syntax starts a quoted literal, and the message then shows its braces. */
const QUOTED_SYNTAX_PATTERN = /'[{}#]/;

type TLocaleMessages = {
	settings: {
		entries: { apiTokens: Record<string, string> };
		apiTokens: Record<string, string>;
	};
};

function readMessages(file: string): TLocaleMessages {
	const localePath = resolve(LOCALES_DIRECTORY, file);
	const content = readFileSync(localePath, 'utf8');
	return JSON.parse(content) as TLocaleMessages;
}

function argumentsOf(message: string) {
	const names = [...message.matchAll(ARGUMENT_PATTERN)].map((match) => match[1]);
	return [...new Set(names)].sort();
}

function messagesOf(messages: TLocaleMessages): Record<string, string> {
	const entry = messages.settings.entries.apiTokens;
	const page = messages.settings.apiTokens;
	const flat: Record<string, string> = {};
	for (const [key, value] of Object.entries(entry ?? {})) {
		flat[`entries.apiTokens.${key}`] = value;
	}
	for (const [key, value] of Object.entries(page ?? {})) {
		flat[`apiTokens.${key}`] = value;
	}
	return flat;
}

const localeFiles = readdirSync(LOCALES_DIRECTORY).filter((file) => file.endsWith('.json'));
const english = messagesOf(readMessages('en.json'));

describe('API tokens settings translations', () => {
	it('covers the 13 languages of the app', () => {
		expect(localeFiles).toHaveLength(13);
	});

	it('names the settings entry and writes the page in English', () => {
		expect(english['entries.apiTokens.TITLE']).toBe('API tokens');
		expect(english['apiTokens.SECRET_TEXT']).toContain('{name}');
	});

	it.each(localeFiles)('defines every API tokens message in %s with the English arguments', (file) => {
		const messages = messagesOf(readMessages(file));

		expect(Object.keys(messages).sort()).toEqual(Object.keys(english).sort());
		for (const [key, englishMessage] of Object.entries(english)) {
			expect(messages[key]).toBeTruthy();
			expect(argumentsOf(messages[key])).toEqual(argumentsOf(englishMessage));
			expect(QUOTED_SYNTAX_PATTERN.test(messages[key])).toBe(false);
		}
	});
});
