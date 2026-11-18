import { announceLayoutRestart, layOutFor } from './layout-direction';
import { localeFor } from './messages';
import type { AppLocale } from './messages';
import { setAppLocale } from './translate';

/** Where the app keeps the language and the restart marker: AsyncStorage, in the app. */
export interface LanguageStorage {
	getItem(key: string): Promise<string | null>;
	setItem(key: string, value: string): Promise<void>;
	removeItem(key: string): Promise<void>;
}

const RESTARTED_FOR_KEY = 'LayoutRestartedFor';

/**
 * Sets the app's language at start. A new layout direction shows after a restart: when one is needed, it happens before
 * the language shows in the old direction, and once only, so a direction that does not take never restarts in a loop.
 */
export async function startIn(tag: string, storage: LanguageStorage, reload: () => Promise<void>): Promise<void> {
	const locale = localeFor(tag);
	if (!layOutFor(locale)) {
		setAppLocale(tag);
		await storage.removeItem(RESTARTED_FOR_KEY).catch(ignoreFailure);
		return;
	}
	const restarting = await restartOnceFor(locale, storage, reload);
	if (!restarting) {
		setAppLocale(tag);
	}
}

function ignoreFailure(): void {
	return undefined;
}

/**
 * Restarts the app once for the direction of this language. Answers false when it did already, or when the restart
 * cannot happen: without the marker the app could restart at every start, so the language shows in the old direction.
 */
async function restartOnceFor(
	locale: AppLocale,
	storage: LanguageStorage,
	reload: () => Promise<void>
): Promise<boolean> {
	try {
		const restartedFor = await storage.getItem(RESTARTED_FOR_KEY);
		if (restartedFor === locale) {
			return false;
		}
		await storage.setItem(RESTARTED_FOR_KEY, locale);
		await reload();
		return true;
	} catch {
		return false;
	}
}

/**
 * Applies the language of the person's profile. It is saved first, so a restart for its direction starts in it; not
 * saved, it shows for this session only, and its direction waits for the next start.
 */
export async function applyProfileLanguage(code: string, save: (code: string) => Promise<void>): Promise<void> {
	let saved = true;
	try {
		await save(code);
	} catch {
		saved = false;
	}
	const locale = setAppLocale(code);
	if (!saved) {
		return;
	}
	if (layOutFor(locale)) {
		announceLayoutRestart();
	}
}
