import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const LOCALES_DIRECTORY = resolve(__dirname, '../../locales');

type TDiscardMessages = Record<string, string | Record<string, string>>;
type TLocaleMessages = { timer: { discard: TDiscardMessages } };

function discardMessagesOf(file: string): TDiscardMessages {
	const content = readFileSync(resolve(LOCALES_DIRECTORY, file), 'utf8');
	const messages = JSON.parse(content) as TLocaleMessages;
	return messages.timer.discard;
}

/** Every message of the discard as `path → text`, the sources and failures included. */
function flatten(messages: TDiscardMessages): Record<string, string> {
	const flat: Record<string, string> = {};
	for (const [key, value] of Object.entries(messages)) {
		if (typeof value === 'string') {
			flat[key] = value;
			continue;
		}
		for (const [childKey, childValue] of Object.entries(value)) {
			flat[`${key}.${childKey}`] = childValue;
		}
	}
	return flat;
}

const localeFiles = readdirSync(LOCALES_DIRECTORY).filter((file) => file.endsWith('.json'));
const translatedLocaleFiles = localeFiles.filter((file) => file !== 'en.json');
const english = flatten(discardMessagesOf('en.json'));
const englishKeys = Object.keys(english);

describe('translations of the timer discard (#5219)', () => {
	it('covers the 13 languages of the app', () => {
		expect(localeFiles).toHaveLength(13);
	});

	it.each(localeFiles)('says everything the discard shows in %s', (file) => {
		const messages = flatten(discardMessagesOf(file));

		expect(Object.keys(messages)).toEqual(englishKeys);
		for (const key of englishKeys) {
			expect(messages[key]).toBeTruthy();
		}
	});

	it.each(localeFiles)('names the app a run started from in %s', (file) => {
		expect(flatten(discardMessagesOf(file)).DESCRIPTION_ELSEWHERE).toContain('{source}');
	});

	it.each(translatedLocaleFiles)('says it in the language of %s', (file) => {
		const messages = flatten(discardMessagesOf(file));

		for (const key of englishKeys) {
			expect(messages[key]).not.toBe(english[key]);
		}
	});
});
