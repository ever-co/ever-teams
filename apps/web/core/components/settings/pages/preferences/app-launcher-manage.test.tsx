/** @jest-environment jsdom */

import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { Provider } from 'jotai';

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string, values?: Record<string, unknown>) =>
		[key, ...Object.values(values ?? {})].join(' ')
}));

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
			app('demand', 'Ever Demand', 'soon')
		],
		isCurrentEverApp: (entry: { id: string }) => entry.id === 'teams'
	};
});

import { AppLauncherManage } from './app-launcher-manage';

const STORAGE_KEY = 'app-launcher-apps';

function stored() {
	return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? 'null');
}

function renderEditor() {
	return render(
		<Provider>
			<AppLauncherManage />
		</Provider>
	);
}

function section(id: string) {
	const group = document.querySelector<HTMLElement>(`[data-section="${id}"]`);
	if (!group) {
		throw new Error(`no section ${id}`);
	}
	return group;
}

function rowNames(id: string) {
	return within(section(id))
		.getAllByTestId('manage-apps-row')
		.map((row) => row.getAttribute('data-name'));
}

beforeAll(() => {
	// jsdom has no PointerEvent, which Base UI's checkbox dispatches when it is clicked
	if (typeof window.PointerEvent === 'undefined') {
		window.PointerEvent = MouseEvent as unknown as typeof PointerEvent;
	}
});

beforeEach(() => {
	window.localStorage.clear();
	// After the next render, as in a browser: a row that moved to another section is drawn there by then.
	jest.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
		setTimeout(() => callback(0), 0);
		return 0;
	});
});

afterEach(() => {
	jest.restoreAllMocks();
});

describe('Manage apps', () => {
	it('lists the Ever apps in the shared order, Ever Demand coming soon', () => {
		renderEditor();

		expect(rowNames('ever')).toEqual([
			'Ever Platform',
			'Ever Works',
			'Ever Teams',
			'Ever Gauzy',
			'Ever Rec',
			'Ever Traduora',
			'Ever Demand'
		]);
		expect(within(section('ever')).getByText('switchers.CHIP_SOON')).toBeTruthy();
		expect(within(section('ever')).getByText('switchers.CHIP_CURRENT')).toBeTruthy();
	});

	it('pins an app into Pinned and saves it in this browser', () => {
		renderEditor();

		fireEvent.click(screen.getByRole('checkbox', { name: 'settings.preferences.MANAGE_APPS_PIN Ever Works' }));

		expect(rowNames('pinned')).toEqual(['Ever Works']);
		expect(rowNames('ever')).not.toContain('Ever Works');
		expect(stored().pinned).toEqual(['ever:works']);
		expect(screen.getByRole('status').textContent).toBe('settings.preferences.MANAGE_APPS_SAVED');
	});

	it('hides an app but never the one you are in', () => {
		renderEditor();

		fireEvent.click(screen.getByRole('checkbox', { name: 'settings.preferences.MANAGE_APPS_SHOW Ever Platform' }));

		expect(stored().hidden).toEqual(['ever:platform']);
		const teamsShow = screen.getByRole('checkbox', { name: 'settings.preferences.MANAGE_APPS_SHOW Ever Teams' });
		expect(teamsShow.getAttribute('aria-disabled') === 'true' || teamsShow.hasAttribute('disabled')).toBe(true);
	});

	it('moves a row with its arrows and with Alt+Arrow', () => {
		renderEditor();

		fireEvent.click(screen.getByRole('button', { name: 'settings.preferences.MANAGE_APPS_MOVE_UP Ever Gauzy' }));
		expect(rowNames('ever').slice(0, 4)).toEqual(['Ever Platform', 'Ever Works', 'Ever Gauzy', 'Ever Teams']);

		const handle = screen.getByRole('button', { name: 'settings.preferences.MANAGE_APPS_REORDER Ever Platform' });
		act(() => {
			handle.focus();
		});
		fireEvent.keyDown(handle, { key: 'ArrowDown', altKey: true });

		expect(rowNames('ever').slice(0, 2)).toEqual(['Ever Works', 'Ever Platform']);
		expect(stored().order.ever.slice(0, 2)).toEqual(['ever:works', 'ever:platform']);
		expect(screen.getByRole('status').textContent).toBe('settings.preferences.MANAGE_APPS_MOVED Ever Platform 2');
		// The keyboard stays on the handle of the row that moved.
		expect(document.activeElement?.getAttribute('aria-label')).toBe(
			'settings.preferences.MANAGE_APPS_REORDER Ever Platform'
		);
	});

	it('keeps the keyboard on the pin box of a row that pinning moved to Pinned', async () => {
		renderEditor();
		const pin = screen.getByRole('checkbox', { name: 'settings.preferences.MANAGE_APPS_PIN Ever Works' });
		act(() => {
			pin.focus();
		});

		fireEvent.click(pin);

		await waitFor(() => {
			const moved = within(section('pinned')).getByRole('checkbox', {
				name: 'settings.preferences.MANAGE_APPS_PIN Ever Works'
			});
			expect(document.activeElement).toBe(moved);
		});
	});

	it('does not count a pin of an app this deployment no longer lists', () => {
		window.localStorage.setItem(
			STORAGE_KEY,
			JSON.stringify({
				hidden: [],
				pinned: ['ever:works', 'ever:gone', 'custom:gone'],
				order: { ever: [], yours: [] },
				custom: []
			})
		);
		renderEditor();

		expect(screen.getByText('settings.preferences.MANAGE_APPS_PIN_COUNT 1 6')).toBeTruthy();
		expect(rowNames('pinned')).toEqual(['Ever Works']);
	});

	it('says so when the browser refuses to keep the change', () => {
		renderEditor();
		jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
			throw new DOMException('full', 'QuotaExceededError');
		});

		fireEvent.click(screen.getByRole('checkbox', { name: 'settings.preferences.MANAGE_APPS_PIN Ever Works' }));

		expect(screen.getByRole('status').textContent).toBe('settings.preferences.SYNC_SAVE_FAILED');
	});

	it('says so when the browser blocks its storage altogether, and keeps the choice for this page', () => {
		renderEditor();
		jest.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
			throw new DOMException('denied', 'SecurityError');
		});

		fireEvent.click(screen.getByRole('checkbox', { name: 'settings.preferences.MANAGE_APPS_PIN Ever Works' }));

		expect(screen.getByRole('status').textContent).toBe('settings.preferences.SYNC_SAVE_FAILED');
		expect(rowNames('pinned')).toEqual(['Ever Works']);
	});

	it('stops at six pins', () => {
		renderEditor();
		for (const name of ['Ever Platform', 'Ever Works', 'Ever Teams', 'Ever Gauzy', 'Ever Rec', 'Ever Traduora']) {
			fireEvent.click(screen.getByRole('checkbox', { name: `settings.preferences.MANAGE_APPS_PIN ${name}` }));
		}

		const demandPin = screen.getByRole('checkbox', { name: 'settings.preferences.MANAGE_APPS_PIN Ever Demand' });
		expect(demandPin.getAttribute('aria-disabled') === 'true' || demandPin.hasAttribute('disabled')).toBe(true);
		expect(stored().pinned).toHaveLength(6);
	});

	it('adds an app of your own under Your apps, refuses an address that is not a web address, and removes it', () => {
		renderEditor();
		const name = screen.getByLabelText('settings.preferences.ADD_APP_NAME');
		const address = screen.getByLabelText('settings.preferences.ADD_APP_URL');
		const submit = screen.getByRole('button', { name: 'settings.preferences.ADD_APP_SUBMIT' });

		fireEvent.change(name, { target: { value: 'Grafana' } });
		fireEvent.change(address, { target: { value: 'grafana' } });
		fireEvent.click(submit);
		expect(screen.getByRole('alert').textContent).toBe('settings.preferences.ADD_APP_URL_INVALID 20');

		fireEvent.change(address, { target: { value: 'https://grafana.example.com' } });
		fireEvent.click(submit);
		expect(rowNames('yours')).toEqual(['Grafana']);
		expect(stored().custom).toEqual([
			expect.objectContaining({ name: 'Grafana', url: 'https://grafana.example.com/' })
		]);

		fireEvent.click(screen.getByRole('button', { name: 'settings.preferences.MANAGE_APPS_REMOVE Grafana' }));
		expect(document.querySelector('[data-section="yours"]')).toBeNull();
		expect(stored().custom).toEqual([]);
	});
});
