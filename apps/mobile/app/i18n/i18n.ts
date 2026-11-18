import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { reloadAppAsync } from 'expo';
import { isLaidOutRightToLeft } from './layout-direction';
import { startIn } from './start-language';
import type { Messages } from './messages';

const setLanguage = async () => {
	const locale = await AsyncStorage.getItem('Language');

	if (!locale) {
		const locales = Localization?.getLocales?.();
		const deviceLocale = locales?.[0]?.languageTag ?? 'en';
		AsyncStorage.setItem('Language', deviceLocale);
		await startIn(deviceLocale, AsyncStorage, reloadAppAsync);
	} else {
		await startIn(locale, AsyncStorage, reloadAppAsync);
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
