import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const LOCALES_DIRECTORY = resolve(__dirname, '../../locales');

type StartMoveMessages = Record<string, string>;

function readStartMove(file: string): StartMoveMessages {
	const content = readFileSync(resolve(LOCALES_DIRECTORY, file), 'utf8');
	const messages = JSON.parse(content) as { timer: { startMove: StartMoveMessages } };
	return messages.timer.startMove;
}

/** The ICU arguments of a message, sorted. */
function argumentsOf(message: string) {
	return [...message.matchAll(/\{(\w+)/g)].map((match) => match[1]).sort();
}

const localeFiles = readdirSync(LOCALES_DIRECTORY).filter((file) => file.endsWith('.json'));
const translatedLocaleFiles = localeFiles.filter((file) => file !== 'en.json');
const english = readStartMove('en.json');

describe('Running timer start translations', () => {
	it.each(localeFiles)('defines every message of the start panel in %s with the English arguments', (file) => {
		const messages = readStartMove(file);

		expect(Object.keys(messages)).toEqual(Object.keys(english));
		for (const [key, englishMessage] of Object.entries(english)) {
			expect(messages[key]).toBeTruthy();
			expect(argumentsOf(messages[key])).toEqual(argumentsOf(englishMessage));
		}
	});

	it.each(translatedLocaleFiles)('speaks the language of %s in the start panel', (file) => {
		const messages = readStartMove(file);

		for (const key of Object.keys(english)) {
			expect(messages[key]).not.toBe(english[key]);
		}
	});
});
