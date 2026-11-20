import { loginHeadingKeysOf, loginLogoOf } from './login-heading';
import {
	everTeamsLogoDarkThemeAndroid,
	everTeamsLogoLightTheme,
	everTeamsLogoLightThemeAndroid
} from '../../../components/svgs/icons';

describe("the sign-in page's heading", () => {
	it('titles each step as before', () => {
		expect(loginHeadingKeysOf(true, 1, false).title).toBe('loginScreen.enterDetails2');
		expect(loginHeadingKeysOf(true, 1, true).title).toBe('loginScreen.enterDetails3');
		expect(loginHeadingKeysOf(false, 1, false).title).toBe('loginScreen.enterDetails');
		expect(loginHeadingKeysOf(false, 3, false)).toEqual({
			title: 'loginScreen.joinTeam',
			hint: 'loginScreen.joinTeamHint'
		});
	});

	it('draws dark letters on the light page and white letters on the dark one', () => {
		expect(loginLogoOf('light', true)).toBe(everTeamsLogoLightThemeAndroid);
		expect(loginLogoOf('light', false)).toBe(everTeamsLogoLightTheme);
		expect(loginLogoOf('dark', true)).toBe(everTeamsLogoDarkThemeAndroid);
	});
});
