/**
 * @jest-environment node
 */
// cspell:ignore bcher
import {
	activityBrandOf,
	activityHostOf,
	appNameKeyOf,
	faviconPathOf,
	faviconsEnabled,
	isFaviconHost
} from './activity-icons';

describe('appNameKeyOf', () => {
	it('reads an app name in lower case, without .exe or .app, dashes and dots as spaces', () => {
		expect(appNameKeyOf('Code.exe')).toBe('code');
		expect(appNameKeyOf('Figma.app')).toBe('figma');
		expect(appNameKeyOf('  Microsoft   Teams ')).toBe('microsoft teams');
		expect(appNameKeyOf('Code - Insiders')).toBe('code insiders');
	});
});

describe('activityHostOf', () => {
	it('reads the recorded address first, then a title that is a bare host', () => {
		expect(activityHostOf({ title: 'Pull request #5041', kind: 'url', url: 'https://github.com/ever-co' })).toBe(
			'github.com'
		);
		expect(activityHostOf({ title: 'www.youtube.com' })).toBe('www.youtube.com');
	});

	it('gives an app no host, a program name included, and refuses addresses that are not web ones', () => {
		expect(activityHostOf({ title: 'figma.com', kind: 'app' })).toBeNull();
		// A browser's entry holds the page it showed: the browser is still an app
		expect(activityHostOf({ title: 'Google Chrome', kind: 'app', url: 'https://github.com/ever-co' })).toBeNull();
		expect(activityHostOf({ title: 'Code.exe' })).toBeNull();
		expect(activityHostOf({ title: 'Slack' })).toBeNull();
		expect(activityHostOf({ title: 'x', url: 'javascript:alert(1)' })).toBeNull();
	});
});

describe('activityBrandOf', () => {
	it('recognises a common app by its name, whatever its suffix or case', () => {
		expect(activityBrandOf({ title: 'Code.exe' })?.key).toBe('vscode');
		expect(activityBrandOf({ title: 'Figma', kind: 'app' })).toEqual({ key: 'figma', color: '#F24E1E' });
		expect(activityBrandOf({ title: 'Microsoft Teams' })?.key).toBe('teams');
		expect(activityBrandOf({ title: 'Google Chrome', kind: 'app', url: 'https://github.com/ever-co' })?.key).toBe(
			'chrome'
		);
		expect(activityBrandOf({ title: 'Cursor', kind: 'app' })?.key).toBe('cursor');
		// A known app whose name reads like a host, where the row does not say which it is; a real site keeps its own
		expect(activityBrandOf({ title: 'Figma.app' })?.key).toBe('figma');
		expect(activityBrandOf({ title: 'linear.app' })?.key).toBe('linear');
		expect(activityBrandOf({ title: 'sublime_text.exe' })?.key).toBe('sublimetext');
		expect(activityBrandOf({ title: 'Brave Browser' })?.key).toBe('brave');
	});

	it('recognises a site by its host or a sub-domain, the most precise domain first', () => {
		expect(activityBrandOf({ title: 'www.github.com' })?.key).toBe('github');
		expect(activityBrandOf({ title: 'Inbox', kind: 'url', url: 'https://mail.google.com/mail/u/0' })?.key).toBe(
			'gmail'
		);
		expect(activityBrandOf({ title: 'google.com' })?.key).toBe('google');
		expect(activityBrandOf({ title: 'gemini.google.com' })?.key).toBe('gemini');
		expect(
			activityBrandOf({ title: 'My Drive', kind: 'url', url: 'https://drive.google.com/drive/u/0' })?.key
		).toBe('googledrive');
		expect(activityBrandOf({ title: 'ever-co.atlassian.net' })?.key).toBe('atlassian');
	});

	it('has no brand for an unknown app or site, nor for a page title without its address', () => {
		expect(activityBrandOf({ title: 'Some Internal Tool' })).toBeNull();
		expect(activityBrandOf({ title: 'example.org' })).toBeNull();
		expect(activityBrandOf({ title: 'YouTube', kind: 'url' })).toBeNull();
	});
});

describe('isFaviconHost', () => {
	it('takes a public DNS name of two labels or more', () => {
		expect(isFaviconHost('github.com')).toBe(true);
		expect(isFaviconHost('xn--bcher-kva.example')).toBe(true);
	});

	it('refuses an IP address, a single label, a port, a path or a bad label', () => {
		for (const host of ['127.0.0.1', 'localhost', 'github.com:443', 'github.com/x', '-bad.com', 'a..b', '']) {
			expect(isFaviconHost(host)).toBe(false);
		}
	});
});

describe('the favicon route switch', () => {
	const saved = process.env.NEXT_PUBLIC_FAVICONS_ENABLED;
	afterEach(() => {
		process.env.NEXT_PUBLIC_FAVICONS_ENABLED = saved;
	});

	it('is off unless the deployment says true, and the path stays on the app', () => {
		delete process.env.NEXT_PUBLIC_FAVICONS_ENABLED;
		expect(faviconsEnabled()).toBe(false);
		process.env.NEXT_PUBLIC_FAVICONS_ENABLED = 'true';
		expect(faviconsEnabled()).toBe(true);
		expect(faviconPathOf('github.com')).toBe('/api/favicons/github.com');
	});
});
