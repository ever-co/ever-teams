import browser from '~misc/browser';

/**
 * A message of the extension in the browser's language (`locales/<language>/messages.json`), English when the browser
 * speaks a language the extension does not have. Answers the key itself when the message does not exist.
 */
export function t(key: string, substitutions?: string | string[]): string {
	const message = browser.i18n.getMessage(key, substitutions);
	if (message) {
		return message;
	}
	return key;
}
