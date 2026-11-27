/** @jest-environment jsdom */

import { render, screen, within } from '@testing-library/react';
import { Provider } from 'jotai';

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string, values?: Record<string, unknown>) =>
		[key, ...Object.values(values ?? {})].join(' ')
}));

/** What the deployment gives, changed per case: the "+" tile shows only with a Platform link. */
const mockDeployment = { addUrl: 'https://platform.example.com/apps?add=app' };

jest.mock('@/core/constants/config/ever-apps', () =>
	jest.requireActual('@/test/app-launcher/ever-apps-module').everAppsModule(
		[
			['platform', 'Ever Platform'],
			['works', 'Ever Works'],
			['teams', 'Ever Teams'],
			['demand', 'Ever Demand', 'soon'],
			['tech', 'Ever Tech']
		],
		() => mockDeployment.addUrl
	)
);

import { AppRail } from './app-rail';

function renderRail() {
	window.localStorage.setItem('app-switcher-placement', JSON.stringify('rail'));
	render(
		<Provider>
			<AppRail />
		</Provider>
	);
	return screen.getByRole('navigation', { name: 'switchers.APP_LAUNCHER' });
}

beforeEach(() => {
	window.localStorage.clear();
	mockDeployment.addUrl = 'https://platform.example.com/apps?add=app';
});

describe('the App Launcher rail', () => {
	it('opens every other app in the same tab: plain links named by the app, with no target or rel', () => {
		const rail = renderRail();

		const works = within(rail).getByRole('link', { name: 'Ever Works' });
		expect(works.getAttribute('href')).toBe('https://works.example.com/');
		const links = within(rail).getAllByRole('link');
		expect(links.length).toBeGreaterThan(0);
		for (const link of links) {
			expect(link.hasAttribute('target')).toBe(false);
			expect(link.hasAttribute('rel')).toBe(false);
		}
		expect(rail.textContent).not.toMatch(/new tab|OPENS_IN_NEW_TAB/i);
	});

	it('lists Ever Tech, and keeps the app you are in and Ever Demand without a link as plain tiles', () => {
		const rail = renderRail();

		expect(within(rail).getByRole('link', { name: 'Ever Tech' }).getAttribute('href')).toBe(
			'https://tech.example.com/'
		);
		expect(within(rail).queryByRole('link', { name: /Ever Teams/ })).toBeNull();
		expect(within(rail).queryByRole('link', { name: /Ever Demand/ })).toBeNull();
		expect(rail.querySelector('[aria-current="page"]')?.textContent).toContain('Ever Teams');
	});

	it('ends with a "+" tile to Ever Platform\'s Add an app page, named by its tooltip text', () => {
		const rail = renderRail();

		const links = within(rail).getAllByRole('link');
		const add = within(rail).getByRole('link', { name: 'switchers.ADD_APPS_IN_PLATFORM' });
		expect(links.at(-1)).toBe(add);
		expect(add.getAttribute('href')).toBe('https://platform.example.com/apps?add=app');
		expect(add.hasAttribute('target')).toBe(false);
	});

	it('has no "+" tile when the deployment links no Ever Platform', () => {
		mockDeployment.addUrl = '';
		const rail = renderRail();

		expect(within(rail).queryByRole('link', { name: 'switchers.ADD_APPS_IN_PLATFORM' })).toBeNull();
	});
});
