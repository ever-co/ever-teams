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

jest.mock('@/core/constants/config/ever-apps', () => {
	const app = (id: string, name: string, status = 'available') => {
		const isLinked = id !== 'teams' && status !== 'soon';
		return {
			id,
			name,
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
			app('demand', 'Ever Demand', 'soon')
		],
		isCurrentEverApp: (entry: { id: string }) => entry.id === 'teams'
	};
});

import { AppSwitcherMenu, MANAGE_APPS_HREF } from './app-switcher-menu';

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

	it("opens other apps in a new tab, marks the app you are in and lists Ever Demand as coming soon, not as a link", () => {
		const menu = openLauncher();

		const works = within(menu).getByRole('menuitem', { name: /Ever Works/ });
		expect(works.getAttribute('href')).toBe('https://works.example.com/');
		expect(works.getAttribute('target')).toBe('_blank');
		expect(works.getAttribute('rel')).toBe('noopener noreferrer');

		const teams = within(menu).getByRole('menuitem', { name: /Ever Teams/ });
		expect(teams.getAttribute('aria-current')).toBe('page');
		expect(within(teams).getByText('switchers.CHIP_CURRENT')).toBeTruthy();

		const demand = within(menu).getByRole('menuitem', { name: /Ever Demand/ });
		expect(demand.getAttribute('href')).toBeNull();
		expect(within(demand).getByText('switchers.CHIP_SOON')).toBeTruthy();
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
		expect(within(yours).getByRole('menuitem', { name: /Grafana/ }).getAttribute('href')).toBe(
			'https://grafana.example.com/'
		);
		expect(within(menu).queryByRole('menuitem', { name: /Ever Platform/ })).toBeNull();
	});

	it('ends with the footer line and the way to Manage apps', () => {
		const menu = openLauncher();

		expect(within(menu).getByText('switchers.LAUNCHER_FOOTER')).toBeTruthy();
		const manage = within(menu).getByRole('menuitem', { name: 'switchers.MANAGE_APPS' });
		expect(manage.getAttribute('href')).toBe(MANAGE_APPS_HREF);
	});
});
