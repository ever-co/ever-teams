import type { BrowserContext, Locator, Page, TestInfo } from '@playwright/test';
import { expect, test } from '../../fixtures';
import { overrideRuntimeEnv } from '../../helpers';
import { PLATFORM_ORIGIN } from '../../test-servers';

/**
 * The App Launcher in its three positions (sidebar star, top-bar grid, left rail): every other app opens in the SAME
 * tab (owner, 2026-11-26), each row is a logo, the full name and one line with no host, Ever Tech is listed, and
 * "+ Add" leads to Ever Platform's add page. The links point at a local origin a route answers, so the shield (which
 * fails any test whose browser leaves the machine) stays on, and a click really navigates.
 */
const LANDING = `${PLATFORM_ORIGIN}/ever-apps`;

const LINKS: Record<string, string> = {
	platform: `${PLATFORM_ORIGIN}/`,
	works: `${LANDING}/works/`,
	gauzy: `${LANDING}/gauzy/`,
	rec: `${LANDING}/rec/`,
	traduora: `${LANDING}/traduora/`,
	tech: `${LANDING}/tech/`
};

const ADD_URL = `${PLATFORM_ORIGIN}/apps?add=app`;

/** Ever Demand gets no link here, so it is listed as "Soon" and is not a link. */
const ROW_NAMES = [
	'Ever Platform',
	'Ever Works',
	'Ever Teams',
	'Ever Gauzy',
	'Ever Rec',
	'Ever Traduora',
	'Ever Demand',
	'Ever Tech'
];

type Placement = 'sidebar' | 'header' | 'rail';

/** Opens every page of the test with this deployment's links and the person's chosen position. */
async function withLauncher(page: Page, placement: Placement) {
	await overrideRuntimeEnv(page, {
		NEXT_PUBLIC_EVER_APP_LINKS: Object.entries(LINKS)
			.map(([id, url]) => `${id}=${url}`)
			.join(',')
	});
	// hardVisit clears the storage between its two loads; an init script runs again on the second one.
	await page.addInitScript((value) => {
		window.localStorage.setItem('app-switcher-placement', JSON.stringify(value));
	}, placement);
	await page.context().route(
		(url) => url.href.startsWith(LANDING) || url.href === ADD_URL || url.href === LINKS.platform,
		(route) =>
			route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Landed</title><p>Landed</p>' })
	);
}

/** Every new page or popup the context opens: a same-tab launcher never opens one. */
function watchNewPages(context: BrowserContext) {
	const opened: string[] = [];
	context.on('page', (page) => opened.push(page.url()));
	return opened;
}

async function openPanel(page: Page) {
	await page.getByRole('button', { name: 'App Launcher' }).click();
	const panel = page.getByRole('menu', { name: 'App Launcher' });
	await expect(panel).toBeVisible();
	return panel;
}

async function expectRowsOf(panel: Locator) {
	const ever = panel.getByRole('group', { name: 'Ever apps' });
	const rows = ever.getByRole('menuitem');
	await expect(rows).toHaveCount(ROW_NAMES.length);
	const texts = await rows.allTextContents();
	expect(texts.map((text) => ROW_NAMES.find((name) => text.includes(name)))).toEqual(ROW_NAMES);
	await expect(ever.getByText('AI agents that run your business')).toBeVisible();
	await expect(ever.getByText('Engineers and operated agents for hire')).toBeVisible();
	// No host and no address anywhere in the panel, and no link that asks for a new tab.
	expect(await panel.textContent()).not.toMatch(/127\.0\.0\.1|https?:|new tab/i);
	expect(await panel.locator('a[target], a[rel]').count()).toBe(0);
	await expect(ever.getByRole('menuitem', { name: /Ever Teams/ })).toHaveAttribute('aria-current', 'page');
	await expect(ever.getByRole('menuitem', { name: /Ever Demand/ })).toContainText('Soon');
}

/** Evidence for the PR and the brief: the open launcher in light, then in dark. */
async function snapBothThemes(page: Page, testInfo: TestInfo, name: string) {
	await testInfo.attach(`${name}-light`, { body: await page.screenshot(), contentType: 'image/png' });
	await page.emulateMedia({ colorScheme: 'dark' });
	await testInfo.attach(`${name}-dark`, { body: await page.screenshot(), contentType: 'image/png' });
	await page.emulateMedia({ colorScheme: 'light' });
}

test.describe('the App Launcher', () => {
	test('in the sidebar: eight rows with a line each, no host, and a row opens in the same tab', async ({
		app,
		context,
		page
	}, testInfo) => {
		await withLauncher(page, 'sidebar');
		await app('/');
		const opened = watchNewPages(context);

		const panel = await openPanel(page);
		await expectRowsOf(panel);
		await expect(panel.getByRole('menuitem', { name: 'Add your own apps in Ever Platform' })).toHaveAttribute(
			'href',
			ADD_URL
		);
		await snapBothThemes(page, testInfo, 'launcher-sidebar-1280');

		await Promise.all([page.waitForURL(LINKS.works), panel.getByRole('menuitem', { name: /Ever Works/ }).click()]);
		expect(opened).toEqual([]);
		await expect(page.getByText('Landed')).toBeVisible();
	});

	test('in the top bar: the grid opens the same panel, and "+ Add" opens Ever Platform\'s add page in the same tab', async ({
		app,
		context,
		page
	}, testInfo) => {
		await withLauncher(page, 'header');
		await app('/');
		const opened = watchNewPages(context);

		const panel = await openPanel(page);
		await expectRowsOf(panel);
		await snapBothThemes(page, testInfo, 'launcher-topbar-1280');
		await Promise.all([
			page.waitForURL(ADD_URL),
			panel.getByRole('menuitem', { name: 'Add your own apps in Ever Platform' }).click()
		]);
		expect(opened).toEqual([]);
	});

	test('on the rail: plain same-tab tiles, Ever Tech among them, and a "+" tile last', async ({
		app,
		context,
		page
	}, testInfo) => {
		await withLauncher(page, 'rail');
		await app('/');
		const opened = watchNewPages(context);

		const rail = page.getByRole('navigation', { name: 'App Launcher' });
		await expect(rail).toBeVisible();
		expect(await rail.locator('a[target], a[rel]').count()).toBe(0);
		const add = rail.getByRole('link', { name: 'Add your own apps in Ever Platform' });
		await expect(add).toHaveAttribute('href', ADD_URL);
		await expect(rail.getByRole('link').last()).toHaveAttribute('href', ADD_URL);
		await add.hover();
		// The link is named by aria-label (no text of its own), so this text is the tooltip's.
		await expect(page.getByText('Add your own apps in Ever Platform', { exact: true })).toBeVisible();
		await snapBothThemes(page, testInfo, 'launcher-rail-1280');

		await Promise.all([page.waitForURL(LINKS.tech), rail.getByRole('link', { name: 'Ever Tech' }).click()]);
		expect(opened).toEqual([]);
	});

	test('works from the keyboard alone: Enter opens, arrows move, Escape returns to the star, Enter follows a row', async ({
		app,
		context,
		page
	}) => {
		await withLauncher(page, 'sidebar');
		await app('/');
		const opened = watchNewPages(context);
		const trigger = page.getByRole('button', { name: 'App Launcher' });

		await trigger.focus();
		await page.keyboard.press('Enter');
		const panel = page.getByRole('menu', { name: 'App Launcher' });
		await expect(panel).toBeVisible();
		await page.keyboard.press('Escape');
		await expect(panel).toBeHidden();
		await expect(trigger).toBeFocused();

		await page.keyboard.press('Enter');
		await expect(panel).toBeVisible();
		// The first link row is Ever Platform; ArrowDown walks to Ever Works.
		const works = panel.getByRole('menuitem', { name: /Ever Works/ });
		for (let step = 0; step < 8; step += 1) {
			if (await works.evaluate((element) => element.hasAttribute('data-highlighted'))) break;
			await page.keyboard.press('ArrowDown');
		}
		await expect(works).toHaveAttribute('data-highlighted', /.*/);
		await Promise.all([page.waitForURL(LINKS.works), page.keyboard.press('Enter')]);
		expect(opened).toEqual([]);
	});

	test('keeps the star still under reduced motion, turning otherwise', async ({ app, page }) => {
		await withLauncher(page, 'sidebar');
		await app('/');
		const star = page.getByRole('button', { name: 'App Launcher' }).locator('svg');
		const animation = () => star.evaluate((element) => getComputedStyle(element).animationName);

		expect(await animation()).not.toBe('none');
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await expect.poll(animation).toBe('none');
	});

	test('fits a 375 px phone, from the sidebar sheet, in dark mode too', async ({ app, page }, testInfo) => {
		await page.setViewportSize({ width: 375, height: 812 });
		await withLauncher(page, 'rail');
		await app('/');

		// The rail is not drawn on phones: its people find the launcher in the sidebar sheet.
		await page.locator('[data-sidebar="trigger"]').first().click();
		const panel = await openPanel(page);
		await expectRowsOf(panel);
		const box = await panel.boundingBox();
		expect(box).not.toBeNull();
		expect(box?.x ?? -1).toBeGreaterThanOrEqual(8);
		expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(375 - 8);
		await testInfo.attach('launcher-375-light', { body: await page.screenshot(), contentType: 'image/png' });

		await page.emulateMedia({ colorScheme: 'dark' });
		await expect(panel).toBeVisible();
		await testInfo.attach('launcher-375-dark', { body: await page.screenshot(), contentType: 'image/png' });
	});
});
