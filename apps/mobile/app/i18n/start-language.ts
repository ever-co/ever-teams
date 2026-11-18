import { announceLayoutRestart, layOutFor } from './layout-direction';
import { localeFor } from './messages';
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
		await storage.removeItem(RESTARTED_FOR_KEY);
		setAppLocale(tag);
		return;
	}
	const restartedFor = await storage.getItem(RESTARTED_FOR_KEY);
	if (restartedFor === locale) {
		setAppLocale(tag);
		return;
	}
	await storage.setItem(RESTARTED_FOR_KEY, locale);
	await reload();
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
