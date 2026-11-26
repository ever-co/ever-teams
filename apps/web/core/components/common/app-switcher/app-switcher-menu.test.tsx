/** @jest-environment jsdom */

import { fireEvent, render, screen, within } from '@testing-library/react';
import { Provider } from 'jotai';

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string, values?: Record<string, unknown>) =>
		[key, ...Object.values(values ?? {})].join(' ')
}));

jest.mock('next/link', () => {
	function MockLink({ href, children, ...props }: Readonly<{ href: string; children?: React.ReactNode }>) {
		return (
			<a href={href} {...props}>
				{children}
			</a>
		);
	}
	return MockLink;
});

/** What the deployment gives, changed per case: "+ Add" shows only with a Platform link. */
const mockDeployment = { addUrl: 'https://platform.example.com/apps?add=app' };

jest.mock('@/core/constants/config/ever-apps', () => {
	const app = (id: string, name: string, status = 'available') => {
		const isLinked = id !== 'teams' && status !== 'soon';
		return {
			id,
			name,
			lineKey: `switchers.APP_LINE_${id.toUpperCase()}`,
			logo: `/assets/ever-apps/${id}.svg`,
			url: isLinked ? `https://${id}.example.com/` : '',
			domain: isLinked ? `${id}.example.com` : '',
			status
		};
	};
	return {
		HAS_EVER_APP_SWITCHER: true,
		EVER_APPS: [
			app('platform', 'Ever Platform'),
			app('works', 'Ever Works'),
			app('teams', 'Ever Teams'),
			app('gauzy', 'Ever Gauzy'),
			app('rec', 'Ever Rec'),
			app('traduora', 'Ever Traduora'),
			app('demand', 'Ever Demand', 'soon'),
			app('tech', 'Ever Tech')
		],
		get EVER_APP_ADD_URL() {
			return mockDeployment.addUrl;
		},
		isCurrentEverApp: (entry: { id: string }) => entry.id === 'teams'
	};
});

import { AppSwitcherMenu, MANAGE_APPS_HREF } from './app-switcher-menu';

const EVER_APP_NAMES = [
	'Ever Platform',
	'Ever Works',
	'Ever Teams',
	'Ever Gauzy',
	'Ever Rec',
	'Ever Traduora',
	'Ever Demand',
	'Ever Tech'
];

function openLauncher(trigger: 'mark' | 'grid' = 'grid') {
	render(
		<Provider>
			<AppSwitcherMenu side="bottom" align="end" size="icon" trigger={trigger} />
		</Provider>
	);
	fireEvent.click(screen.getByRole('button', { name: 'switchers.APP_LAUNCHER' }));
	return screen.getByRole('menu', { name: 'switchers.APP_LAUNCHER' });
}

beforeEach(() => {
	window.localStorage.clear();
	mockDeployment.addUrl = 'https://platform.example.com/apps?add=app';
});

describe('the App Launcher panel', () => {
	it('is named App Launcher and titled Apps', () => {
		const menu = openLauncher();

		expect(within(menu).getByText('switchers.APPS')).toBeTruthy();
	});

	it('shows only the sections that have rows', () => {
		const menu = openLauncher();

		expect(within(menu).getByRole('group', { name: 'switchers.EVER_APPS' })).toBeTruthy();
		expect(within(menu).queryByRole('group', { name: 'switchers.PINNED' })).toBeNull();
		expect(within(menu).queryByRole('group', { name: 'switchers.YOUR_APPS' })).toBeNull();
	});

	it('lists the eight Ever apps in order, each with its logo, its full name and its one line', () => {
		const menu = openLauncher();

		const ever = within(menu).getByRole('group', { name: 'switchers.EVER_APPS' });
		const rows = within(ever).getAllByRole('menuitem');
		expect(rows.map((row) => EVER_APP_NAMES.find((name) => row.textContent?.includes(name)))).toEqual(
			EVER_APP_NAMES
		);
		for (const row of rows) {
			const name = EVER_APP_NAMES.find((entry) => row.textContent?.includes(entry)) ?? '';
			const id = name.replace('Ever ', '').toLowerCase();
			expect(within(row).getByText(`switchers.APP_LINE_${id.toUpperCase()}`)).toBeTruthy();
			expect(row.querySelector('img')?.getAttribute('src')).toBe(`/assets/ever-apps/${id}.svg`);
		}
	});

	it('opens every other app in the same tab: a plain link, with no target, rel or new-tab text', () => {
		const menu = openLauncher();

		const works = within(menu).getByRole('menuitem', { name: /Ever Works/ });
		expect(works.getAttribute('href')).toBe('https://works.example.com/');
		for (const link of Array.from(menu.querySelectorAll('a'))) {
			expect(link.hasAttribute('target')).toBe(false);
			expect(link.hasAttribute('rel')).toBe(false);
		}
		expect(menu.textContent).not.toMatch(/new tab|OPENS_IN_NEW_TAB/i);
	});

	it('shows no host and no address in the rows', () => {
		const menu = openLauncher();

		expect(menu.textContent).not.toMatch(/example\.com|https?:/);
	});

	it('marks the app you are in, not as a link, and lists Ever Demand as coming soon without a link', () => {
		const menu = openLauncher();

		const teams = within(menu).getByRole('menuitem', { name: /Ever Teams/ });
		expect(teams.getAttribute('aria-current')).toBe('page');
		expect(teams.getAttribute('href')).toBeNull();
		expect(within(teams).getByText('switchers.CHIP_CURRENT')).toBeTruthy();

		const demand = within(menu).getByRole('menuitem', { name: /Ever Demand/ });
		expect(demand.getAttribute('href')).toBeNull();
		expect(within(demand).getByText('switchers.CHIP_SOON')).toBeTruthy();
	});

	it('ends the apps with "+ Add", to Ever Platform\'s Add an app page, in the same tab', () => {
		const menu = openLauncher();

		const add = within(menu).getByRole('menuitem', { name: 'switchers.ADD_APPS_IN_PLATFORM' });
		expect(add.getAttribute('href')).toBe('https://platform.example.com/apps?add=app');
		expect(add.hasAttribute('target')).toBe(false);
		expect(within(add).getByText('switchers.ADD_APP')).toBeTruthy();

		const links = within(menu).getAllByRole('menuitem');
		const manage = within(menu).getByRole('menuitem', { name: 'switchers.MANAGE_APPS' });
		expect(links.indexOf(add)).toBe(links.indexOf(manage) - 1);
		expect(links.slice(0, links.indexOf(add)).every((row) => row.textContent?.includes('Ever '))).toBe(true);
	});

	it('has no "+ Add" when the deployment links no Ever Platform', () => {
		mockDeployment.addUrl = '';
		const menu = openLauncher();

		expect(within(menu).queryByRole('menuitem', { name: 'switchers.ADD_APPS_IN_PLATFORM' })).toBeNull();
		expect(within(menu).queryByText('switchers.ADD_APP')).toBeNull();
	});

	it('lists pinned apps and your own apps in their sections, as arranged in Manage apps', () => {
		window.localStorage.setItem(
			'app-launcher-apps',
			JSON.stringify({
				hidden: ['ever:platform'],
				pinned: ['ever:works'],
				order: { ever: [], yours: [] },
				custom: [{ id: 'grafana', name: 'Grafana', url: 'https://grafana.example.com/' }]
			})
		);
		const menu = openLauncher();

		const pinned = within(menu).getByRole('group', { name: 'switchers.PINNED' });
		expect(within(pinned).getByRole('menuitem', { name: /Ever Works/ })).toBeTruthy();
		const yours = within(menu).getByRole('group', { name: 'switchers.YOUR_APPS' });
		const grafana = within(yours).getByRole('menuitem', { name: /Grafana/ });
		expect(grafana.getAttribute('href')).toBe('https://grafana.example.com/');
		expect(grafana.hasAttribute('target')).toBe(false);
		expect(within(menu).queryByRole('menuitem', { name: /Ever Platform/ })).toBeNull();
	});

	it('ends with the footer line and the way to Manage apps', () => {
		const menu = openLauncher();

		expect(within(menu).getByText('switchers.LAUNCHER_FOOTER')).toBeTruthy();
		const manage = within(menu).getByRole('menuitem', { name: 'switchers.MANAGE_APPS' });
		expect(manage.getAttribute('href')).toBe(MANAGE_APPS_HREF);
	});
});
