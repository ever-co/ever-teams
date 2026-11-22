import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const LOCALES_DIRECTORY = resolve(__dirname, '../../locales');

function pageNotLoadedOf(file: string): string | undefined {
	const content = readFileSync(resolve(LOCALES_DIRECTORY, file), 'utf8');
	const parsed = JSON.parse(content) as { pages?: { error?: { PAGE_NOT_LOADED?: string } } };
	return parsed.pages?.error?.PAGE_NOT_LOADED;
}

const files = readdirSync(LOCALES_DIRECTORY).filter((file) => file.endsWith('.json'));
const english = pageNotLoadedOf('en.json');

/** What a page says when the signed-in user could not be read (#5694), in every language. */
describe('page not loaded message', () => {
	it('exists in English', () => {
		expect(english).toBe('This page could not be loaded');
	});

	it.each(files.filter((file) => file !== 'en.json'))('is translated in %s', (file) => {
		const message = pageNotLoadedOf(file);

		expect(message).toBeTruthy();
		expect(message).not.toBe(english);
		// An apostrophe before a brace would quote ICU syntax and show it raw
		expect(message).not.toMatch(/'[{}#]/);
	});
});
