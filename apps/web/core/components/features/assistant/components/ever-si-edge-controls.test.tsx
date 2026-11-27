/** @jest-environment jsdom */
import type { ReactNode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { createStore, Provider } from 'jotai';
import { everSiPanelOpenAtom, everSiReturnPathAtom } from '../atoms/ever-si-panel.atom';
import { EverSiDockButton, EverSiOpenButton } from './ever-si-edge-controls';

const mockNavigation = { pathname: '/en/dashboard' };
const mockSidebar = { isMobile: false };
const mockRouter = { push: jest.fn() };

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string) => key
}));
jest.mock('next/navigation', () => ({
	usePathname: () => mockNavigation.pathname,
	useRouter: () => mockRouter
}));
jest.mock('next/link', () => ({
	__esModule: true,
	default: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
		<a href={href} {...props}>
			{children}
		</a>
	)
}));
jest.mock('@/core/components/common/sidebar', () => ({
	useSidebar: () => mockSidebar
}));

function renderWithStore(ui: ReactNode, store = createStore()) {
	render(<Provider store={store}>{ui}</Provider>);
	return store;
}

function openButton() {
	return screen.queryByRole('button', { name: 'chatView.OPEN_ASSISTANT' });
}

describe("Ever SI's button on the sidebar's edge", () => {
	beforeEach(() => {
		localStorage.clear();
		mockNavigation.pathname = '/en/dashboard';
		mockSidebar.isMobile = false;
	});

	it('shows while Ever SI is collapsed, named for what it does', () => {
		renderWithStore(<EverSiOpenButton />);

		const button = openButton() as HTMLElement;
		expect(button.id).toBe('ever-si-open-button');
		expect(button.getAttribute('aria-expanded')).toBe('false');
		expect(button.getAttribute('type')).toBe('button');
	});

	it('opens the panel beside the page, remembers it, and hands the focus to the panel', () => {
		const panel = document.createElement('aside');
		panel.id = 'ever-si-panel';
		panel.tabIndex = -1;
		document.body.append(panel);
		const frames: FrameRequestCallback[] = [];
		const requestFrame = jest.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
			frames.push(callback);
			return frames.length;
		});

		const store = renderWithStore(<EverSiOpenButton />);
		fireEvent.click(openButton() as HTMLElement);

		expect(store.get(everSiPanelOpenAtom)).toBe(true);
		expect(localStorage.getItem('ever-si-panel-open')).toBe('true');
		// The panel is there now, so its button is not.
		expect(openButton()).toBeNull();
		frames.forEach((frame) => frame(0));
		expect(document.activeElement).toBe(panel);

		requestFrame.mockRestore();
		panel.remove();
	});

	it('is not shown while the panel is open', () => {
		const store = createStore();
		store.set(everSiPanelOpenAtom, true);

		renderWithStore(<EverSiOpenButton />, store);

		expect(openButton()).toBeNull();
	});

	it('is not shown on the full page, where the page is Ever SI', () => {
		mockNavigation.pathname = '/en/assistant';

		renderWithStore(<EverSiOpenButton />);

		expect(openButton()).toBeNull();
	});

	it('is not shown on phones, whose menu keeps the Ever SI row', () => {
		mockSidebar.isMobile = true;

		renderWithStore(<EverSiOpenButton />);

		expect(openButton()).toBeNull();
	});

	it('is not shown to the visitors of a public team page', () => {
		renderWithStore(<EverSiOpenButton publicTeam />);

		expect(openButton()).toBeNull();
	});
});

describe("The full page's way back to the panel", () => {
	beforeEach(() => {
		localStorage.clear();
		mockRouter.push.mockClear();
	});

	function dockButton() {
		return screen.getByRole('button', { name: 'chatView.DOCK_ASSISTANT' });
	}

	it('goes back to the page Ever SI was widened from, with the panel open beside it', () => {
		const store = createStore();
		store.set(everSiReturnPathAtom, '/en/tasks?view=board');
		renderWithStore(<EverSiDockButton />, store);

		fireEvent.click(dockButton());

		expect(store.get(everSiPanelOpenAtom)).toBe(true);
		expect(mockRouter.push).toHaveBeenCalledWith('/en/tasks?view=board');
	});

	it('leads home when the full page was the first page of the visit', () => {
		const store = renderWithStore(<EverSiDockButton />);

		fireEvent.click(dockButton());

		expect(store.get(everSiPanelOpenAtom)).toBe(true);
		expect(mockRouter.push).toHaveBeenCalledWith('/');
	});

	it('is a desktop control: hidden below the breakpoint where Ever SI is full screen either way', () => {
		renderWithStore(<EverSiDockButton />);

		expect(dockButton().className).toContain('hidden');
		expect(dockButton().className).toContain('md:inline-flex');
	});
});
