import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const LOCALES_DIRECTORY = resolve(__dirname, '../../locales');

type TLocaleMessages = { pages: { teamTasks: Record<string, string> } };

function readMessages(file: string): TLocaleMessages {
	return JSON.parse(readFileSync(resolve(LOCALES_DIRECTORY, file), 'utf8')) as TLocaleMessages;
}

const localeFiles = readdirSync(LOCALES_DIRECTORY).filter((file) => file.endsWith('.json'));
const translatedLocaleFiles = localeFiles.filter((file) => file !== 'en.json');
const englishLabel = readMessages('en.json').pages.teamTasks.CALENDAR_EXPORT;

describe('team tasks calendar export translations', () => {
	it.each(localeFiles)('names the calendar file in %s', (file) => {
		const label = readMessages(file).pages.teamTasks.CALENDAR_EXPORT;

		expect(label).toBeTruthy();
		expect(label).toContain('.ics');
	});

	it.each(translatedLocaleFiles)('speaks the language of %s', (file) => {
		expect(readMessages(file).pages.teamTasks.CALENDAR_EXPORT).not.toBe(englishLabel);
	});
});
