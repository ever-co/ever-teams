import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const LOCALES_DIRECTORY = resolve(__dirname, '../../locales');

type TLocaleMessages = { pages: { projects: { billable: Record<string, string> } } };

function billableMessagesOf(file: string): Record<string, string> {
	const localePath = resolve(LOCALES_DIRECTORY, file);
	const content = readFileSync(localePath, 'utf8');
	const messages = JSON.parse(content) as TLocaleMessages;
	return messages.pages.projects.billable;
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

	it.each(translatedLocaleFiles)('says it in the language of %s', (file) => {
		const messages = billableMessagesOf(file);

		for (const key of englishKeys) {
			expect(messages[key]).not.toBe(english[key]);
		}
	});
});
