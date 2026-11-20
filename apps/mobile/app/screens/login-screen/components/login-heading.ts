import type { TxKeyPath } from '../../../i18n/i18n';
import type { ColorScheme } from '../../../../src/theme/tokens';
import {
	everTeamsLogoDarkTheme,
	everTeamsLogoDarkThemeAndroid,
	everTeamsLogoLightTheme,
	everTeamsLogoLightThemeAndroid
} from '../../../components/svgs/icons';

export interface LoginHeadingKeys {
	title: TxKeyPath;
	hint: TxKeyPath;
}

/** The title and line of the sign-in page: signing in, choosing a workspace, creating a team or joining one. */
export function loginHeadingKeysOf(withTeam: boolean, screen: number, workspaceScreen: boolean): LoginHeadingKeys {
	if (withTeam && workspaceScreen) {
		return { title: 'loginScreen.enterDetails3', hint: 'loginScreen.hintDetails3' };
	}
	if (withTeam) {
		return { title: 'loginScreen.enterDetails2', hint: 'loginScreen.hintDetails2' };
	}
	if (screen !== 3) {
		return { title: 'loginScreen.enterDetails', hint: 'loginScreen.hintDetails' };
	}
	return { title: 'loginScreen.joinTeam', hint: 'loginScreen.joinTeamHint' };
}

/** The logo on the page's background: white letters in dark mode, dark letters in light mode. */
export function loginLogoOf(scheme: ColorScheme, isAndroid: boolean): string {
	if (scheme === 'dark') {
		if (isAndroid) {
			return everTeamsLogoDarkThemeAndroid;
		}
		return everTeamsLogoDarkTheme;
	}
	if (isAndroid) {
		return everTeamsLogoLightThemeAndroid;
	}
	return everTeamsLogoLightTheme;
}
