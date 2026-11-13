import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const LOCALES_DIRECTORY = resolve(__dirname, '../../locales');
const HELP_MAX_LENGTH = 64;
const SENTENCE_END = /[.!?](?=\s|$)|[。！？]/g;

type TLocaleMessages = { pages: { projects: { billable: Record<string, string> } } };

function billableMessagesOf(file: string): Record<string, string> {
	const localePath = resolve(LOCALES_DIRECTORY, file);
	const content = readFileSync(localePath, 'utf8');
	const messages = JSON.parse(content) as TLocaleMessages;
	return messages.pages.projects.billable;
}

function sentenceCountOf(text: string): number {
	const sentenceEnds = text.match(SENTENCE_END) ?? [];
	return sentenceEnds.length;
}

const directoryFiles = readdirSync(LOCALES_DIRECTORY);
const localeFiles = directoryFiles.filter((file) => file.endsWith('.json'));
const translatedLocaleFiles = localeFiles.filter((file) => file !== 'en.json');
const english = billableMessagesOf('en.json');
const englishKeys = Object.keys(english);

describe("translations of a project's billable setting", () => {
	it.each(localeFiles)('says everything the setting shows in %s', (file) => {
		const messages = billableMessagesOf(file);

		expect(Object.keys(messages)).toEqual(englishKeys);
		for (const key of englishKeys) {
			expect(messages[key]).toBeTruthy();
		}
	});

	it.each(localeFiles)('keeps the help of the switch to one short sentence in %s', (file) => {
		const help = billableMessagesOf(file).HELP;

		expect(help.length).toBeLessThanOrEqual(HELP_MAX_LENGTH);
		expect(sentenceCountOf(help)).toBe(1);
	});

	it.each(translatedLocaleFiles)('says it in the language of %s', (file) => {
		const messages = billableMessagesOf(file);

		for (const key of englishKeys) {
			expect(messages[key]).not.toBe(english[key]);
		}
	});
});
