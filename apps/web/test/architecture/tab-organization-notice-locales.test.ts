import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const LOCALES_DIRECTORY = resolve(__dirname, '../../locales');

type TNoticeMessages = Record<string, string>;

function noticeMessagesOf(file: string): TNoticeMessages {
	const content = readFileSync(resolve(LOCALES_DIRECTORY, file), 'utf8');
	const parsed = JSON.parse(content) as { tabOrganizationNotice?: TNoticeMessages };
	return parsed.tabOrganizationNotice ?? {};
}

/** The `{name}` placeholders of a message, sorted. */
function placeholdersOf(message: string): string[] {
	const found = message.match(/\{\w+\}/g) ?? [];
	return [...found].sort();
}

const files = readdirSync(LOCALES_DIRECTORY).filter((file) => file.endsWith('.json'));
const english = noticeMessagesOf('en.json');

/** What a tab says when another tab opened another organization (#5134), in every language. */
describe('tab organization notice messages', () => {
	it('exists in English, naming the organization the tab keeps', () => {
		expect(Object.keys(english).sort()).toEqual(
			[
				'BRING_BACK',
				'CANNOT_WORK',
				'CANNOT_WORK_TITLE',
				'KEEPS_WORKING',
				'OPEN_HERE',
				'STOP_TIMER_FIRST',
				'TITLE'
			].sort()
		);
		expect(english.KEEPS_WORKING).toContain('{organization}');
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

		for (const key of Object.keys(english)) {
			expect(messages[key]).not.toBe(english[key]);
		}
	});
});
