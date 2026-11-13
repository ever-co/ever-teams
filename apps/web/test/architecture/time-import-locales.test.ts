import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const LOCALES_DIRECTORY = resolve(__dirname, '../../locales');
/** ICU arguments: `{name}` and the counted argument of a plural, `{count, plural, ...}`. */
const ARGUMENT_PATTERN = /\{(\w+)[,}]/g;
/** An apostrophe right before ICU syntax starts a quoted literal, and the message then shows its braces. */
const QUOTED_SYNTAX_PATTERN = /'[{}#]/;

type TMessageTree = { [key: string]: string | TMessageTree };

type TLocaleMessages = {
	timeImport: TMessageTree;
	settings: { entries: { import: Record<string, string> } };
};

function readMessages(file: string): TLocaleMessages {
	const localePath = resolve(LOCALES_DIRECTORY, file);
	const content = readFileSync(localePath, 'utf8');
	return JSON.parse(content) as TLocaleMessages;
}

function flatMessagesOf(tree: TMessageTree, prefix = ''): Record<string, string> {
	const messages: Record<string, string> = {};
	for (const [key, value] of Object.entries(tree)) {
		const path = `${prefix}${key}`;
		if (typeof value === 'string') {
			messages[path] = value;
			continue;
		}
		Object.assign(messages, flatMessagesOf(value, `${path}.`));
	}
	return messages;
}

function argumentsOf(message: string) {
	const names = [...message.matchAll(ARGUMENT_PATTERN)].map((match) => match[1]);
	return [...new Set(names)].sort();
}

const localesDirectoryFiles = readdirSync(LOCALES_DIRECTORY);
const localeFiles = localesDirectoryFiles.filter((file) => file.endsWith('.json'));
const translatedLocaleFiles = localeFiles.filter((file) => file !== 'en.json');
const english = readMessages('en.json');
const englishImport = flatMessagesOf(english.timeImport);

describe('time import translations', () => {
	it('covers the 13 languages of the app', () => {
		expect(localeFiles).toHaveLength(13);
	});

	it.each(localeFiles)('defines every time import message in %s with the English arguments', (file) => {
		const messages = flatMessagesOf(readMessages(file).timeImport);

		expect(Object.keys(messages).sort()).toEqual(Object.keys(englishImport).sort());
		for (const [key, englishMessage] of Object.entries(englishImport)) {
			expect(messages[key]).toBeTruthy();
			expect(argumentsOf(messages[key])).toEqual(argumentsOf(englishMessage));
			expect(QUOTED_SYNTAX_PATTERN.test(messages[key])).toBe(false);
		}
	});

	it.each(localeFiles)('names the Import page of the settings in %s', (file) => {
		const entry = readMessages(file).settings.entries.import;

		expect(entry.TITLE).toBeTruthy();
		expect(entry.DESCRIPTION).toBeTruthy();
	});

	it.each(translatedLocaleFiles)('speaks the language of %s from the file to the report', (file) => {
		const messages = flatMessagesOf(readMessages(file).timeImport);

		for (const key of [
			'DROP_TITLE',
			'TEMPLATE_DOWNLOAD',
			'PREVIEW_TITLE',
			'problems.END_MISSING',
			'status.LEFT_OUT'
		]) {
			expect(messages[key]).not.toBe(englishImport[key]);
		}
	});
});
