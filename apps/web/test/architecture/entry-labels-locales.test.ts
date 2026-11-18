import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const LOCALES_DIRECTORY = resolve(__dirname, '../../locales');

type TLabelsMessages = Record<string, string>;
type TLocaleMessages = { timer: { labels: TLabelsMessages } };

function labelsMessagesOf(file: string): TLabelsMessages {
	const content = readFileSync(resolve(LOCALES_DIRECTORY, file), 'utf8');
	const messages = JSON.parse(content) as TLocaleMessages;
	return messages.timer.labels;
}

const localeFiles = readdirSync(LOCALES_DIRECTORY).filter((file) => file.endsWith('.json'));
const translatedLocaleFiles = localeFiles.filter((file) => file !== 'en.json');
const english = labelsMessagesOf('en.json');
const englishKeys = Object.keys(english);

/** The sentences, which no language writes as English does; a word such as "Label" can be the same. */
const SENTENCES = ['NO_LABELS_YET', 'SAVE_FAILED', 'OVERLAP_MESSAGE', 'CREATE_FAILED'];

describe('translations of the labels of time entries (#5368)', () => {
	it('covers the 13 languages of the app', () => {
		expect(localeFiles).toHaveLength(13);
	});

	it.each(localeFiles)('says everything the labels show in %s', (file) => {
		const messages = labelsMessagesOf(file);

		expect(Object.keys(messages)).toEqual(englishKeys);
		for (const key of englishKeys) {
			expect(messages[key]).toBeTruthy();
		}
	});

	it.each(localeFiles)('names the label to create and counts the labels in %s', (file) => {
		const messages = labelsMessagesOf(file);

		expect(messages.CREATE).toContain('{name}');
		expect(messages.COUNT).toMatch(/^\{count, plural, /);
	});

	it.each(translatedLocaleFiles)('says it in the language of %s', (file) => {
		const messages = labelsMessagesOf(file);

		for (const key of SENTENCES) {
			expect(messages[key]).not.toBe(english[key]);
		}
	});
});
