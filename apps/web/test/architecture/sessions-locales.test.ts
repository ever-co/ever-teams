import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const LOCALES_DIRECTORY = resolve(__dirname, '../../locales');
const SOURCES = [
	resolve(__dirname, '../../core/components/settings/pages/profile/sessions-section.tsx'),
	resolve(__dirname, '../../core/components/settings/pages/profile/sign-out-others-dialog.tsx')
];
/** ICU arguments: `{name}` and the counted argument of a plural, `{count, plural, ...}`. */
const ARGUMENT_PATTERN = /\{(\w+)[,}]/g;
/** An apostrophe right before ICU syntax starts a quoted literal, and the message then shows its braces. */
const QUOTED_SYNTAX_PATTERN = /'[{}#]/;

type TLocaleMessages = { settings: { sessions: Record<string, string> } };

function sessionsMessagesOf(file: string): Record<string, string> {
	const content = readFileSync(resolve(LOCALES_DIRECTORY, file), 'utf8');
	return (JSON.parse(content) as TLocaleMessages).settings.sessions;
}

function argumentsOf(message: string) {
	const names = [...message.matchAll(ARGUMENT_PATTERN)].map((match) => match[1]);
	return [...new Set(names)].sort();
}

/** Whether every `{` of the message is closed, and never more than opened. */
function hasBalancedBraces(message: string): boolean {
	let depth = 0;
	for (const character of message) {
		if (character === '{') {
			depth += 1;
		}
		if (character === '}') {
			depth -= 1;
		}
		if (depth < 0) {
			return false;
		}
	}
	return depth === 0;
}

/** Every `settings.sessions.*` key the section and its dialog ask for. */
function keysTheSectionUses(): string[] {
	const keys = SOURCES.flatMap((source) => {
		const text = readFileSync(source, 'utf8');
		return [...text.matchAll(/'settings\.sessions\.([A-Z][A-Z_]*[A-Z])'/g)].map((match) => match[1]);
	});
	return [...new Set(keys)].sort();
}

const localeFiles = readdirSync(LOCALES_DIRECTORY).filter((file) => file.endsWith('.json'));
const translatedLocaleFiles = localeFiles.filter((file) => file !== 'en.json');
const english = sessionsMessagesOf('en.json');

describe('sessions translations', () => {
	it('covers the 13 languages of the app', () => {
		expect(localeFiles).toHaveLength(13);
	});

	it('defines in English every key the Sessions section asks for, and none it does not', () => {
		expect(Object.keys(english).sort()).toEqual(keysTheSectionUses());
	});

	it.each(localeFiles)('defines every sessions message in %s with the English arguments', (file) => {
		const messages = sessionsMessagesOf(file);

		expect(Object.keys(messages).sort()).toEqual(Object.keys(english).sort());
		for (const [key, englishMessage] of Object.entries(english)) {
			expect(messages[key]).toBeTruthy();
			expect(argumentsOf(messages[key])).toEqual(argumentsOf(englishMessage));
			expect(hasBalancedBraces(messages[key])).toBe(true);
			expect(QUOTED_SYNTAX_PATTERN.test(messages[key])).toBe(false);
		}
	});

	it.each(localeFiles)('gives every counted sessions message of %s its "other" form', (file) => {
		const messages = sessionsMessagesOf(file);

		for (const message of Object.values(messages)) {
			if (message.includes(', plural,')) {
				expect(message).toMatch(/\bother \{/);
			}
		}
	});

	it.each(translatedLocaleFiles)('speaks the language of %s for the sessions', (file) => {
		const messages = sessionsMessagesOf(file);

		for (const key of ['DESCRIPTION', 'SIGN_OUT_OTHERS', 'CONSEQUENCE_OTHERS', 'WRONG_PASSWORD', 'NEEDS_CODE']) {
			expect(messages[key]).not.toBe(english[key]);
		}
	});
});
