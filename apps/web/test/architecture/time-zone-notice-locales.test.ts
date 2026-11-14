import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const LOCALES_DIRECTORY = resolve(__dirname, '../../locales');

/** The sentences a reader must get in their own language. */
const SENTENCES = ['TITLE', 'DESCRIPTION', 'TITLE_NO_PROFILE_ZONE', 'DESCRIPTION_NO_PROFILE_ZONE', 'SAVE_FAILED'];

type TNoticeMessages = Record<string, string>;

function noticeMessagesOf(file: string): TNoticeMessages {
	const content = readFileSync(resolve(LOCALES_DIRECTORY, file), 'utf8');
	const parsed = JSON.parse(content) as { timeZoneNotice?: TNoticeMessages };
	return parsed.timeZoneNotice ?? {};
}

/** The `{name}` placeholders of a message, sorted. */
function placeholdersOf(message: string): string[] {
	const found = message.match(/\{\w+\}/g) ?? [];
	return [...found].sort();
}

const files = readdirSync(LOCALES_DIRECTORY).filter((file) => file.endsWith('.json'));
const english = noticeMessagesOf('en.json');

describe('time zone notice messages', () => {
	it('exists in English', () => {
		expect(Object.keys(english).length).toBeGreaterThan(0);
	});

	it('says which views count days in which zone: Timesheets the profile, the other reports the browser', () => {
		expect(english.DESCRIPTION).toMatch(/Timesheets/);
		expect(english.DESCRIPTION).toMatch(/browser/);
		expect(english.DESCRIPTION_NO_PROFILE_ZONE).toMatch(/Timesheets/);
		expect(english.DESCRIPTION_NO_PROFILE_ZONE).toMatch(/browser/);
	});

	it.each(files)('gives %s every message with the English placeholders', (file) => {
		const messages = noticeMessagesOf(file);

		expect(Object.keys(messages).sort()).toEqual(Object.keys(english).sort());
		for (const [key, englishMessage] of Object.entries(english)) {
			expect(messages[key]).toBeTruthy();
			expect(placeholdersOf(messages[key])).toEqual(placeholdersOf(englishMessage));
			// An apostrophe before a brace would quote the placeholder and show it raw
			expect(messages[key]).not.toMatch(/'[{}#]/);
		}
	});

	it.each(files.filter((file) => file !== 'en.json'))('speaks the language of %s', (file) => {
		const messages = noticeMessagesOf(file);

		for (const key of SENTENCES) {
			expect(messages[key]).not.toBe(english[key]);
		}
	});
});
