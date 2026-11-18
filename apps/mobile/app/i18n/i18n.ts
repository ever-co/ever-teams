import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18nManager } from 'react-native';
import { setAppLocale } from './translate';
import type { Messages } from './messages';

const setLanguage = async () => {
	const locale = await AsyncStorage.getItem('Language');

	if (!locale) {
		const locales = Localization?.getLocales?.();
		const deviceLocale = locales?.[0]?.languageTag ?? 'en';
		AsyncStorage.setItem('Language', deviceLocale);
		setAppLocale(deviceLocale);
	} else {
		setAppLocale(locale);
	}
};

setLanguage();

// handle RTL languages
const locales = Localization?.getLocales?.();
export const isRTL = locales?.[0]?.textDirection === 'rtl';
I18nManager?.allowRTL(isRTL);
I18nManager?.forceRTL(isRTL);

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
