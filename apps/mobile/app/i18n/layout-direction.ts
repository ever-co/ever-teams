import { Alert, I18nManager } from 'react-native';
import { reloadAppAsync } from 'expo';
import { MMKV } from 'react-native-mmkv';
import { translate } from './translate';
import type { AppLocale } from './messages';

const RIGHT_TO_LEFT_LOCALES: AppLocale[] = ['ar', 'he'];
const REQUESTED_DIRECTION_KEY = 'requested-direction';

const layoutStorage = new MMKV({ id: 'ever-teams.layout' });

let runningRightToLeft: boolean | undefined;

export function isRightToLeft(locale: AppLocale): boolean {
	return RIGHT_TO_LEFT_LOCALES.includes(locale);
}

function requestedRightToLeft(): boolean | undefined {
	const requested = layoutStorage.getString(REQUESTED_DIRECTION_KEY);
	if (requested === 'rtl') {
		return true;
	}
	if (requested === 'ltr') {
		return false;
	}
	return undefined;
}

/**
 * Whether the screens are laid out right to left now, read once per start: the direction asked for before this start,
 * which a restart applied, or else the process's own. I18nManager.isRTL keeps the direction the process started with,
 * even after a reload that already shows another one.
 */
export function isLaidOutRightToLeft(): boolean {
	if (runningRightToLeft === undefined) {
		runningRightToLeft = requestedRightToLeft() ?? I18nManager.isRTL;
	}
	return runningRightToLeft;
}

function directionName(rightToLeft: boolean): 'rtl' | 'ltr' {
	if (rightToLeft) {
		return 'rtl';
	}
	return 'ltr';
}

/**
 * Asks for the direction of the app's language, whatever the phone's: Arabic on an English phone reads right to left.
 * React Native applies it after a restart: answers whether the screens shown now need one. A language whose direction
 * the screens already have cancels a restart asked for before and never taken.
 */
export function layOutFor(locale: AppLocale): boolean {
	const running = isLaidOutRightToLeft();
	const rightToLeft = isRightToLeft(locale);
	I18nManager.allowRTL(rightToLeft);
	I18nManager.forceRTL(rightToLeft);
	layoutStorage.set(REQUESTED_DIRECTION_KEY, directionName(rightToLeft));
	return running !== rightToLeft;
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
