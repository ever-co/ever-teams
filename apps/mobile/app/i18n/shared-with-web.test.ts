import { readFileSync } from 'fs';
import { resolve } from 'path';
import shared from '../../locales/shared-with-web.json';
import { messagesByLocale } from './messages';
import type { AppLocale } from './messages';

type Tree = { [key: string]: string | Tree };

const WEB_LOCALES = resolve(__dirname, '../../../web/locales');

// The six languages the app takes from the web start from its wording. The app's older languages keep their own until
// a native speaker checks the web's in the app's context: the same English can mean another thing on another screen.
const LOCALES_FROM_THE_WEB: AppLocale[] = ['de', 'it', 'nl', 'pl', 'pt', 'zh'];

function messageAt(tree: Tree, key: string): string | undefined {
	let node: string | Tree | undefined = tree;
	for (const part of key.split('.')) {
		if (typeof node !== 'object') {
			return undefined;
		}
		node = node[part];
	}
	if (typeof node === 'string') {
		return node;
	}
	return undefined;
}

function webMessages(locale: string): Tree {
	return JSON.parse(readFileSync(resolve(WEB_LOCALES, `${locale}.json`), 'utf8'));
}

const webEnglish = webMessages('en');

// A web text still in English in a language was never translated there: it is no wording to keep
function translatedOnTheWeb(locale: AppLocale, web: Tree, webKey: string): boolean {
	if (locale === 'en') {
		return true;
	}
	return messageAt(web, webKey) !== messageAt(webEnglish, webKey);
}

function driftFrom(locale: AppLocale) {
	const web = webMessages(locale);
	const app = messagesByLocale[locale] as Tree;
	return Object.entries(shared)
		.filter(([, webKey]) => translatedOnTheWeb(locale, web, webKey))
		.filter(([appKey, webKey]) => messageAt(app, appKey) !== messageAt(web, webKey))
		.map(([appKey, webKey]) => ({ appKey, app: messageAt(app, appKey), web: messageAt(web, webKey) }));
}

describe('the messages that say the same as the web', () => {
	it('say it in the same English', () => {
		expect(driftFrom('en')).toEqual([]);
	});

	it.each(LOCALES_FROM_THE_WEB)('use the web wording in %s', (locale) => {
		expect(driftFrom(locale)).toEqual([]);
	});
});
