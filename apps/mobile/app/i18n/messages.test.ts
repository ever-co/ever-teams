import { createTranslator } from 'use-intl/core';
import { messagesByLocale, SUPPORTED_LOCALES } from './messages';

type Tree = { [key: string]: string | Tree };

function leaves(tree: Tree, path = ''): Array<[string, string]> {
	return Object.entries(tree).flatMap(([key, value]) => {
		const keyPath = path ? `${path}.${key}` : key;
		if (typeof value === 'string') {
			return [[keyPath, value] as [string, string]];
		}
		return leaves(value, keyPath);
	});
}

function placeholdersOf(message: string): string[] {
	const names = [...message.matchAll(/\{(\w+)/g)].map((match) => match[1]);
	return [...new Set(names)].sort();
}

const english = new Map(leaves(messagesByLocale.en as Tree));
const otherLocales = SUPPORTED_LOCALES.filter((locale) => locale !== 'en');

describe('the messages', () => {
	it.each(otherLocales)('of %s have exactly the English keys', (locale) => {
		const keys = leaves(messagesByLocale[locale] as Tree).map(([key]) => key);

		const missing = [...english.keys()].filter((key) => !keys.includes(key));
		const extra = keys.filter((key) => !english.has(key));

		expect({ missing, extra }).toEqual({ missing: [], extra: [] });
	});

	it.each(otherLocales)('of %s keep the placeholders of the English ones', (locale) => {
		const different = leaves(messagesByLocale[locale] as Tree).filter(([key, message]) => {
			const englishMessage = english.get(key) ?? '';
			return placeholdersOf(message).join() !== placeholdersOf(englishMessage).join();
		});

		expect(different).toEqual([]);
	});

	it.each(SUPPORTED_LOCALES)('of %s are valid ICU messages', (locale) => {
		const errors: string[] = [];
		const t = createTranslator({
			locale,
			messages: messagesByLocale[locale],
			onError: (error) => errors.push(error.message)
		});

		for (const [key, message] of leaves(messagesByLocale[locale] as Tree)) {
			const values = Object.fromEntries(placeholdersOf(message).map((name) => [name, 'x']));
			t(key as Parameters<typeof t>[0], values);
		}

		expect(errors).toEqual([]);
	});
});
