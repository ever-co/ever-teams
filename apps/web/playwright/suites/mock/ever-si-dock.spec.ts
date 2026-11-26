import type { Locator, Page } from '@playwright/test';

import { expect, test } from '../../fixtures';

/**
 * Ever SI has three sizes on a desktop screen, and every step between them is on an edge:
 *
 *   collapsed  its button on the sidebar's edge (the menu has no Ever SI row)
 *   docked     a panel between the sidebar and the page, with collapse / grip / full page on its edge
 *   expanded   the /assistant page, whose far edge leads back to the panel beside the page left behind
 *
 * The component tests pin each control on its own; this file pins what only a browser can: where the
 * controls sit, that a drag moves the real edge, and that the round trip lands on the page it left.
 */

const OPEN = 'Open Ever SI';
const CLOSE = 'Close Ever SI';
const FULL_PAGE = 'Open full page';
const DOCK = 'Show Ever SI beside the page';
const RESIZE = 'Resize Ever SI';

/** A client-side move to a route the dev server has not compiled yet: measured at over 20 s on a cold lane. */
const FIRST_COMPILE = 60_000;

const panelOf = (page: Page) => page.getByRole('complementary', { name: 'Ever SI' });
const openButtonOf = (page: Page) => page.getByRole('button', { name: OPEN });
// The panel's header has a close button and a full-page link of its own: the edge's are the ones outside it.
const edgeCollapseOf = (page: Page) => page.locator(`button[aria-label="${CLOSE}"]:not(aside *)`);
const edgeFullPageOf = (page: Page) => page.locator(`a[aria-label="${FULL_PAGE}"]:not(aside *)`);
const gripOf = (page: Page) => page.getByRole('separator', { name: RESIZE });

async function boxOf(locator: Locator) {
	const box = await locator.boundingBox();
	if (!box) {
		throw new Error('the element has no box: it is not rendered');
	}
	return box;
}

const centerX = (box: { x: number; width: number }) => box.x + box.width / 2;
const centerY = (box: { y: number; height: number }) => box.y + box.height / 2;

test.describe('Ever SI: collapsed, docked, full page', () => {
	test('collapsed: the menu has no Ever SI row, and the button sits on the sidebar edge', async ({ app }) => {
		const page = await app('/team/tasks');

		const openButton = openButtonOf(page);
		await expect(openButton).toBeVisible();
		await expect(panelOf(page)).toHaveCount(0);
		await expect(page.locator('[data-sidebar="menu-button"]', { hasText: /^Ever SI$/ })).toHaveCount(0);

		// On the seam between the sidebar and the page, half over each, at mid-height.
		const button = await boxOf(openButton);
		const pagePanel = await boxOf(page.locator('main').first());
		const viewport = page.viewportSize();
		expect(
			Math.abs(centerX(button) - pagePanel.x),
			'the button is centred on the sidebar edge'
		).toBeLessThanOrEqual(3);
		expect(Math.abs(centerY(button) - (viewport?.height ?? 0) / 2), 'at mid-height').toBeLessThanOrEqual(3);
		expect(button.width, 'a target of at least 24 px').toBeGreaterThanOrEqual(24);
	});

	test('docked: the button opens the panel, whose edge collapses it again', async ({ app }) => {
		const page = await app('/team/tasks');

		await openButtonOf(page).click();

		const panel = panelOf(page);
		await expect(panel).toBeVisible();
		await expect(panel, 'the focus follows into the panel').toBeFocused();
		await expect(openButtonOf(page)).toHaveCount(0);
		await expect(page).toHaveURL(/\/team\/tasks/);

		// The three controls share the panel's free edge: collapse above the grip, the full page below it.
		const panelBox = await boxOf(panel);
		const edge = panelBox.x + panelBox.width;
		const collapse = await boxOf(edgeCollapseOf(page));
		const fullPage = await boxOf(edgeFullPageOf(page));
		expect(Math.abs(centerX(collapse) - edge), 'collapse is on the edge').toBeLessThanOrEqual(8);
		expect(Math.abs(centerX(fullPage) - edge), 'the full-page link is on the edge').toBeLessThanOrEqual(8);
		expect(collapse.y + collapse.height, 'collapse is above the full-page link').toBeLessThan(fullPage.y);

		await edgeCollapseOf(page).click();

		await expect(panel).toHaveCount(0);
		await expect(openButtonOf(page), 'the focus goes back to the button on the sidebar').toBeFocused();
	});

	test('docked: dragging the grip moves the edge, and the width is kept for the next page load', async ({ app }) => {
		const page = await app('/team/tasks');
		await openButtonOf(page).click();
		const panel = panelOf(page);
		const before = await boxOf(panel);

		const grip = await boxOf(gripOf(page));
		// Away from the grip's middle, where the edge's two buttons are: the whole edge drags.
		const startY = grip.y + grip.height / 4;
		await page.mouse.move(centerX(grip), startY);
		await page.mouse.down();
		await page.mouse.move(centerX(grip) + 80, startY, { steps: 4 });
		await page.mouse.up();

		await expect.poll(async () => Math.round((await boxOf(panel)).width)).toBe(Math.round(before.width) + 80);

		await page.reload();
		await expect(panel, 'still docked after a reload').toBeVisible();
		await expect.poll(async () => Math.round((await boxOf(panel)).width)).toBe(Math.round(before.width) + 80);
	});

	test('expanded: the edge leads to the full page, and its far edge back to the page left behind', async ({
		app
	}) => {
		const page = await app('/team/tasks');
		await openButtonOf(page).click();
		await expect(panelOf(page)).toBeVisible();

		await edgeFullPageOf(page).click();

		await expect(page).toHaveURL(/\/assistant/, { timeout: FIRST_COMPILE });
		// The page is Ever SI: no panel beside it, no button on the sidebar.
		await expect(panelOf(page)).toHaveCount(0);
		await expect(openButtonOf(page)).toHaveCount(0);
		const dock = page.getByRole('button', { name: DOCK });
		await expect(dock).toBeVisible();
		const dockBox = await boxOf(dock);
		const pagePanel = await boxOf(page.locator('main').first());
		expect(pagePanel.x + pagePanel.width - (dockBox.x + dockBox.width), 'on the far edge').toBeLessThanOrEqual(16);

		await dock.click();

		await expect(page).toHaveURL(/\/team\/tasks/, { timeout: FIRST_COMPILE });
		await expect(panelOf(page), 'docked again beside the page it was widened from').toBeVisible();
	});
});
