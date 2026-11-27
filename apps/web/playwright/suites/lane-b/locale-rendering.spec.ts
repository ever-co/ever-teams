import { expect, test } from '../../fixtures';
import { APP_ORIGIN } from '../../helpers';

import { appCallsMatching, jarCookieNames, watchMockApi } from './lane-auth-helpers';

/**
 * The locale surfaces, rendered.
 *
 * `app/[locale]/layout-component.tsx` writes `<html lang={locale}>` and **nothing else**: no `dir`, anywhere in
 * `app/`, `core/components/layouts/` or `core/components/auth/` (grep for `dir=` finds none there). The only
 * right-to-left handling in the app is `core/components/pages/chat/message-item.tsx`
 * (`RTL_LANGUAGES = new Set(['ar','he'])`, a `dir` on one message body). So an Arabic page is Arabic *copy* in a
 * left-to-right document, and the tests below say that as it is rather than asserting the direction a reader would
 * expect. `ar` and `he` are both in `APPLICATION_LANGUAGES_CODE` (`core/constants/config/constants.tsx`).
 *
 * The locale lives in two places that are not the same thing — the URL prefix (`next-intl`,
 * `localePrefix: 'as-needed'`) and the app's own `auth-active-language` cookie — and one test pins that they can
 * disagree.
 *
 * The locale *switch* is a limit of this run, not of these tests: the language list comes from
 * `GET /api/languages` → the mock, which answers any path it does not know with `pagination([])`
 * (`cypress/support/mock-gauzy-server.mjs`), so every switcher in the app has nothing to switch to. The last test
 * proves the ask and the empty answer instead of pretending a click changed a language — which is also why the RTL
 * evidence above is a locale URL and not the switcher.
 */

const documentLocale = (page: {
	evaluate: <T>(fn: () => T) => Promise<T>;
}): Promise<{ lang: string | null; dirAttribute: string | null; direction: string }> =>
	page.evaluate(() => ({
		lang: document.documentElement.getAttribute('lang'),
		dirAttribute: document.documentElement.getAttribute('dir'),
		direction: getComputedStyle(document.documentElement).direction
	}));

test.describe('lane-b · the locale surfaces render, and the direction they do not render', () => {
	test('an Arabic sign-in page says so in its markup and in its copy — and keeps a left-to-right document', async ({
		anon
	}) => {
		const view = await anon('/ar/auth/passcode');

		const locale = await documentLocale(view);
		expect(
			locale.lang,
			`/ar/auth/passcode was served <html lang="${locale.lang}">, not lang="ar"`
		).toBe('ar');

		// The copy really is Arabic: the submit of the credentials step and the method switch.
		await expect(
			view.getByRole('button', { name: 'أرسل لي رمزًا' }),
			'the Arabic sign-in page does not offer its Arabic "send me a code" button'
		).toBeVisible();
		await expect(
			view.getByRole('tab', { name: 'كلمة المرور' }),
			'the Arabic page does not offer the Arabic password method'
		).toBeVisible();
		await expect(
			view.locator('#passcode-email'),
			'the Arabic sign-in page does not carry the same field id the other locales do'
		).toBeVisible();

		// REAL DEFECT, asserted as it is: `ar` is a right-to-left language and the document is left-to-right,
		// because nothing but `lang` is written on <html>. A fix that sets `dir="rtl"` fails these two assertions,
		// on purpose. The app's only RTL handling is `core/components/pages/chat/message-item.tsx`.
		expect(
			locale.dirAttribute,
			'the Arabic page now sets a dir attribute — update this pin and say what changed'
		).toBeNull();
		expect(
			locale.direction,
			`the Arabic page now renders ${locale.direction} — update this pin and say what changed`
		).toBe('ltr');
	});

	test('a French sign-in page renders French copy', async ({ anon }) => {
		const view = await anon('/fr/auth/passcode');

		const locale = await documentLocale(view);
		expect(
			locale.lang,
			`/fr/auth/passcode was served <html lang="${locale.lang}">, not lang="fr"`
		).toBe('fr');
		await expect(
			view.getByRole('button', { name: "M'envoyer un code" }),
			'the French sign-in page does not offer its French submit'
		).toBeVisible();
	});

	test('the default locale is not carried in the address', async ({ anon }) => {
		// `next-intl` with `localePrefix: 'as-needed'`: `/en/...` is this app's default locale, so the address the
		// person ends on has no prefix. `/ar/` and `/fr/` keep theirs (the two tests above).
		const view = await anon('/en/auth/passcode');

		await expect(
			view,
			`/en/auth/passcode kept its default-locale prefix (the browser is on ${view.url()})`
		).toHaveURL(/\/auth\/passcode$/);
		const locale = await documentLocale(view);
		expect(locale.lang, `the prefix-less page reports lang="${locale.lang}"`).toBe('en');
	});

	test('a visit in Arabic leaves no locale marker in the browser: the locale is the address', async ({ anon }) => {
		const view = await anon('/ar/auth/passcode');

		/**
		 * The 2026-11-21 run said `an Arabic visit left a locale marker in the jar: NEXT_LOCALE`, and it is right — the
		 * case's assumption was wrong. `next-intl`'s routing config defaults its locale cookie on
		 * (`node_modules/next-intl/dist/esm/production/routing/config.js`:
		 * `localeCookie: … {name:"NEXT_LOCALE", sameSite:"lax", …}`), so the middleware writes that one cookie. What the
		 * **app** keeps in a cookie is its language, `auth-active-language`, and an Arabic visit by a signed-out visitor
		 * writes none of the `auth-*` family. Pinned as measured: exactly next-intl's marker, and no language cookie.
		 */
		const localeCookies = (await jarCookieNames(view.context())).filter((name) => /lang|locale/i.test(name));
		expect(
			localeCookies,
			`an Arabic visit left something other than next-intl's own locale marker: ${await jarCookieNames(view.context())}`
		).toEqual(['NEXT_LOCALE']);
		expect(
			await jarCookieNames(view.context()),
			'an Arabic visit wrote a cookie of the app\'s own session family'
		).not.toContain('auth-active-language');
	});

	test('the address locale and the cookie locale are different things, and they can disagree', async ({ app }) => {
		// The fixture session carries `auth-active-language=en` (`authCookieNames` in helpers.ts); the address says
		// Arabic. Nothing reconciles them: the rendered document follows the address, the cookie stays as it was.
		const view = await app('/ar/settings/personal/preferences');

		const locale = await documentLocale(view);
		expect(
			locale.lang,
			`a signed-in visit to /ar/... was served lang="${locale.lang}" instead of ar`
		).toBe('ar');

		const languageCookie = (await view.context().cookies()).find((cookie) => cookie.name === 'auth-active-language');
		expect(
			languageCookie?.value,
			`the visit changed the app's language cookie (it now reads ${JSON.stringify(languageCookie?.value)}); the address locale alone is supposed to render the page`
		).toBe('en');
	});

	test('the language list this deployment offers is empty, which is why no switcher here can switch', async ({
		app
	}) => {
		// Settings › Personal › Preferences › LanguageRow (`core/components/settings/pages/preferences/`) reads the
		// languages through `usePreferredLanguage` → `languageService.getLanguages` → GET /languages. Attach the
		// watcher after the shell opened, so what it records is this page's own ask.
		// The ask is on the **mock** leg, not on this app: `languageService.getLanguages` is an API-client call, and in a
		// mock run the client posts `GET <mock origin>/api/languages` (axios builds the `/api` segment,
		// `core/services/client/axios.ts:110`). The 2026-11-21 red was this watcher watching the app origin:
		// `Expected: > 0 / Received: 0` after 20 000 ms. The mock does answer that path — `pagination([])`
		// (`cypress/support/mock-gauzy-server.mjs`: `if (pathname === '/api/languages') return pagination([]);`) — which
		// is why the row then says "No language is available."
		const shell = await app('/');
		const calls = watchMockApi(shell);

		await shell.goto(`${APP_ORIGIN}/settings/personal/preferences`, { waitUntil: 'domcontentloaded' });

		await expect
			.poll(async () => appCallsMatching(calls(), '/api/languages').length, { timeout: 20_000 })
			.toBeGreaterThan(0);

		await expect(
			shell.getByText('No language is available.'),
			'the language row offers something although this mock answers the language list empty'
		).toBeVisible({ timeout: 20_000 });
	});
});
