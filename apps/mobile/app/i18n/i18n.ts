import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { reloadAppAsync } from 'expo';
import { isLaidOutRightToLeft, layOutFor } from './layout-direction';
import { setAppLocale } from './translate';
import type { Messages } from './messages';

const RESTARTED_FOR_KEY = 'LayoutRestartedFor';

// A new layout direction shows after a restart: at start it happens at once, before the person sees a screen, and
// once only, so a direction that does not take never restarts the app in a loop
async function startIn(tag: string) {
	const locale = setAppLocale(tag);
	if (!layOutFor(locale)) {
		await AsyncStorage.removeItem(RESTARTED_FOR_KEY);
		return;
	}
	const restartedFor = await AsyncStorage.getItem(RESTARTED_FOR_KEY);
	if (restartedFor === locale) {
		return;
	}
	await AsyncStorage.setItem(RESTARTED_FOR_KEY, locale);
	await reloadAppAsync();
}

const setLanguage = async () => {
	const locale = await AsyncStorage.getItem('Language');

	if (!locale) {
		const locales = Localization?.getLocales?.();
		const deviceLocale = locales?.[0]?.languageTag ?? 'en';
		AsyncStorage.setItem('Language', deviceLocale);
		await startIn(deviceLocale);
	} else {
		await startIn(locale);
	}
};

setLanguage();

// The direction the app is laid out in, which follows its language (startIn), not the phone's
export const isRTL = isLaidOutRightToLeft();

/**
 * Builds up valid keypaths for translations.
 */
export type TxKeyPath = RecursiveKeyOf<Messages>;

// via: https://stackoverflow.com/a/65333050
type RecursiveKeyOf<TObj extends object> = {
	[TKey in keyof TObj & (string | number)]: RecursiveKeyOfHandleValue<TObj[TKey], `${TKey}`>;
}[keyof TObj & (string | number)];

type RecursiveKeyOfInner<TObj extends object> = {
	[TKey in keyof TObj & (string | number)]: RecursiveKeyOfHandleValue<TObj[TKey], `['${TKey}']` | `.${TKey}`>;
}[keyof TObj & (string | number)];

type RecursiveKeyOfHandleValue<TValue, Text extends string> = TValue extends any[]
	? Text
	: TValue extends object
	? Text | `${Text}${RecursiveKeyOfInner<TValue>}`
	: Text;
