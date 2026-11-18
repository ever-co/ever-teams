import { Alert, I18nManager } from 'react-native';
import { reloadAppAsync } from 'expo';
import { MMKV } from 'react-native-mmkv';
import { translate } from './translate';
import type { AppLocale } from './messages';

const RIGHT_TO_LEFT_LOCALES: AppLocale[] = ['ar', 'he'];
const REQUESTED_DIRECTION_KEY = 'requested-direction';

const layoutStorage = new MMKV({ id: 'ever-teams.layout' });

export function isRightToLeft(locale: AppLocale): boolean {
	return RIGHT_TO_LEFT_LOCALES.includes(locale);
}

/**
 * Whether the app is laid out right to left. I18nManager.isRTL keeps the direction the process started with, even
 * after a reload that already shows the new one: the direction last asked for wins over it.
 */
export function isLaidOutRightToLeft(): boolean {
	const requested = layoutStorage.getString(REQUESTED_DIRECTION_KEY);
	if (requested === 'rtl') {
		return true;
	}
	if (requested === 'ltr') {
		return false;
	}
	return I18nManager.isRTL;
}

/**
 * Lays the app out in the direction of its language, whatever the phone's: Arabic on an English phone reads right to
 * left. React Native applies a new direction only after a restart: answers whether one is needed.
 */
export function layOutFor(locale: AppLocale): boolean {
	const rightToLeft = isRightToLeft(locale);
	I18nManager.allowRTL(rightToLeft);
	if (isLaidOutRightToLeft() === rightToLeft) {
		return false;
	}
	I18nManager.forceRTL(rightToLeft);
	layoutStorage.set(REQUESTED_DIRECTION_KEY, directionName(rightToLeft));
	return true;
}

function directionName(rightToLeft: boolean): 'rtl' | 'ltr' {
	if (rightToLeft) {
		return 'rtl';
	}
	return 'ltr';
}

function restartNow(): void {
	void reloadAppAsync();
}

/** Tells the person the app restarts to lay out its screens in the new language's direction, and lets them wait. */
export function announceLayoutRestart(): void {
	Alert.alert(
		translate('settingScreen.changeLanguage.restartTitle'),
		translate('settingScreen.changeLanguage.restartMessage'),
		[
			{ text: translate('settingScreen.changeLanguage.restartLater'), style: 'cancel' },
			{ text: translate('settingScreen.changeLanguage.restartNow'), onPress: restartNow }
		]
	);
}
