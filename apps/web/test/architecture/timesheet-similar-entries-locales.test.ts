import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const LOCALES_DIRECTORY = resolve(__dirname, '../../locales');

type TLocaleMessages = { dashboard: { timesheets: { SIMILAR: Record<string, string> } } };

function similarMessagesOf(file: string): Record<string, string> {
	const localePath = resolve(LOCALES_DIRECTORY, file);
	const content = readFileSync(localePath, 'utf8');
	const messages = JSON.parse(content) as TLocaleMessages;
	return messages.dashboard.timesheets.SIMILAR;
}

/** The placeholders of an ICU message, `{task}` or `{count, plural, ...}`, without the plural's own `#`. */
function placeholdersOf(message: string): string[] {
	const names = new Set<string>();
	for (const match of message.matchAll(/\{(\w+)(?=[,}])/g)) {
		names.add(match[1]);
	}
	return [...names].sort();
}

const directoryFiles = readdirSync(LOCALES_DIRECTORY);
const localeFiles = directoryFiles.filter((file) => file.endsWith('.json'));
const translatedLocaleFiles = localeFiles.filter((file) => file !== 'en.json');
const english = similarMessagesOf('en.json');
const englishKeys = Object.keys(english);

describe('translations of grouped timesheet entries', () => {
	it.each(localeFiles)('says everything a group row, its menu and the View menu show in %s', (file) => {
		const messages = similarMessagesOf(file);

		expect(Object.keys(messages)).toEqual(englishKeys);
		for (const key of englishKeys) {
			expect(messages[key]).toBeTruthy();
		}
	});

	it.each(localeFiles)('keeps the placeholders of every message in %s', (file) => {
		const messages = similarMessagesOf(file);

		for (const key of englishKeys) {
			expect(placeholdersOf(messages[key])).toEqual(placeholdersOf(english[key]));
		}
	});

	it.each(translatedLocaleFiles)('says it in the language of %s', (file) => {
		const messages = similarMessagesOf(file);

		for (const key of englishKeys) {
			expect(messages[key]).not.toBe(english[key]);
		}
	});
});
