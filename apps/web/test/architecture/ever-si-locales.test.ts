import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Ever SI is the assistant's name in every Ever app (spec A7): never "Assistant", "AI assistant" or "Chat", and a
 * proper name, so it is the same in all 13 languages. Every message that named the assistant names Ever SI now.
 */
const LOCALES_DIRECTORY = resolve(__dirname, '../../locales');
const WEB_ROOT = resolve(__dirname, '../..');

/** The name on its own: the sidebar row, the page title, the author of the answers. */
const NAME_KEYS = ['chatView.ASSISTANT', 'chatView.ASSISTANT_NAME', 'chatView.HEADER_TITLE'];

/** Sentences and labels that name Ever SI inside the reader's language. */
const NAMING_KEYS = [
	'chatView.OPEN_ASSISTANT',
	'chatView.COLLAPSE_ASSISTANT',
	'chatView.EXPAND_ASSISTANT',
	'chatView.STANDARD_ASSISTANT_WIDTH',
	'chatView.RESIZE_ASSISTANT',
	'chatView.ASK_PLACEHOLDER',
	'chatView.COMPOSER_LABEL',
	'chatView.NO_KEY_DESCRIPTION',
	'chatConfig.DIALOG_TITLE',
	'chatConfig.DIALOG_DESCRIPTION',
	'chatConfig.API_KEY_HINT',
	'richEditor.ai.SETUP_DESCRIPTION'
];

/** The panel's other words: deleting a conversation, the full page, and the A7 disclosure. */
const PANEL_KEYS = ['chatView.CLEAR_CONVERSATION', 'chatView.OPEN_FULL_PAGE', 'chatView.DISCLOSURE'];

const ALL_KEYS = [...NAME_KEYS, ...NAMING_KEYS, ...PANEL_KEYS];
const TRANSLATED_KEYS = [...NAMING_KEYS, ...PANEL_KEYS];

/** The word "assistant" in the 13 languages, as these messages spelled it before. */
const ASSISTANT_WORDS = /assistant|assistent|asistente|asystent|асистент|ассистент|助手|مساعد|עוזר/i;

const DISCLOSURE_EN =
	"You're chatting with Ever's SI assistant. It can make mistakes. We keep this conversation for 30 days. Delete it any time.";

type Messages = { [key: string]: string | Messages };

function messageAt(messages: Messages, path: string): string | undefined {
	const value = path.split('.').reduce<unknown>((node, key) => (node as Messages | undefined)?.[key], messages);
	if (typeof value === 'string') {
		return value;
	}
	return undefined;
}

function readMessages(file: string): Messages {
	return JSON.parse(readFileSync(resolve(LOCALES_DIRECTORY, file), 'utf8')) as Messages;
}

/** The ICU arguments of a message: what stands right after a brace opened outside any plural branch. */
function argumentsOf(message: string) {
	const names: string[] = [];
	let depth = 0;
	for (let index = 0; index < message.length; index += 1) {
		const character = message[index];
		if (character === '}') {
			depth -= 1;
			continue;
		}
		if (character !== '{') {
			continue;
		}
		const isArgument = depth === 0;
		depth += 1;
		if (!isArgument) {
			continue;
		}
		const name = /^\w+/.exec(message.slice(index + 1));
		if (name) {
			names.push(name[0]);
		}
	}
	return names.sort();
}

const localeFiles = readdirSync(LOCALES_DIRECTORY).filter((file) => file.endsWith('.json'));
const translatedLocaleFiles = localeFiles.filter((file) => file !== 'en.json');
const english = readMessages('en.json');

describe('Ever SI translations', () => {
	it('covers the 13 languages of the app', () => {
		expect(localeFiles).toHaveLength(13);
	});

	it.each(localeFiles)('defines every Ever SI message in %s with the English arguments', (file) => {
		const messages = readMessages(file);

		for (const key of ALL_KEYS) {
			const message = messageAt(messages, key);
			expect(message).toBeTruthy();
			expect(argumentsOf(message as string)).toEqual(argumentsOf(messageAt(english, key) as string));
		}
	});

	it.each(localeFiles)('calls the assistant Ever SI in %s, untranslated', (file) => {
		const messages = readMessages(file);

		for (const key of NAME_KEYS) {
			expect(messageAt(messages, key)).toBe('Ever SI');
		}
		for (const key of NAMING_KEYS) {
			expect(messageAt(messages, key)).toContain('Ever SI');
		}
	});

	it.each(localeFiles)('no longer says "assistant" where %s names Ever SI', (file) => {
		const messages = readMessages(file);

		for (const key of [...NAME_KEYS, ...NAMING_KEYS]) {
			expect(messageAt(messages, key)).not.toMatch(ASSISTANT_WORDS);
		}
		// The product's name no longer stands in for the assistant's.
		for (const key of ALL_KEYS) {
			expect(messageAt(messages, key)).not.toContain('{appName}');
		}
	});

	it.each(translatedLocaleFiles)('speaks the language of %s around Ever SI', (file) => {
		const messages = readMessages(file);

		for (const key of TRANSLATED_KEYS) {
			expect(messageAt(messages, key)).not.toBe(messageAt(english, key));
		}
	});

	it('words the disclosure as spec A7 does, and keeps its facts in every language', () => {
		expect(messageAt(english, 'chatView.DISCLOSURE')).toBe(DISCLOSURE_EN);
		for (const file of localeFiles) {
			const disclosure = messageAt(readMessages(file), 'chatView.DISCLOSURE');
			expect(disclosure).toContain('Ever');
			expect(disclosure).toContain('SI');
			expect(disclosure).toContain('30');
		}
	});

	it('names the full page Ever SI for the authentication guard and its logs', () => {
		const page = readFileSync(resolve(WEB_ROOT, 'core/components/features/assistant/assistant-page.tsx'), 'utf8');

		expect(page).toContain("displayName: 'Ever SI'");
		expect(page).not.toMatch(/displayName: 'Assistant'/);
	});
});
