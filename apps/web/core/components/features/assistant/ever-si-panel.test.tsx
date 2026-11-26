/** @jest-environment jsdom */
import type { ReactNode } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { createStore, Provider } from 'jotai';
import { EverSiPanel } from './ever-si-panel';
import { everSiPanelOpenAtom, everSiPanelWidthAtom } from './atoms/ever-si-panel.atom';
import { EVER_SI_PANEL_WIDTH, clampEverSiPanelWidth, maxEverSiPanelWidth } from './ever-si-panel-width';

const mockNavigation = { pathname: '/en/dashboard' };
const mockSidebar = { isMobile: false };

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string) => key
}));
jest.mock('next/navigation', () => ({
	usePathname: () => mockNavigation.pathname
}));
// The chat body loads on demand in the app; here a stand-in shows where it goes and which title it gets.
jest.mock('next/dynamic', () => ({
	__esModule: true,
	default: () =>
		function EverSiPanelBodyStub({ title }: { title: ReactNode }) {
			return <div data-testid="ever-si-body">{title}</div>;
		}
}));
jest.mock('@/core/components/common/sidebar', () => ({
	useSidebar: () => mockSidebar
}));
jest.mock('@/core/components/common/sheet', () => ({
	Sheet: ({ children }: { children: ReactNode }) => <div data-testid="ever-si-sheet">{children}</div>,
	SheetContent: ({ children, id }: { children: ReactNode; id?: string }) => (
		<div role="dialog" id={id}>
			{children}
		</div>
	),
	SheetTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>
}));

const WIDTH_KEY = 'ever-si-panel-width';

function renderPanel(store = createStore(), publicTeam = false) {
	render(
		<Provider store={store}>
			<EverSiPanel publicTeam={publicTeam} />
		</Provider>
	);
	return store;
}

function openStore(width?: number) {
	const store = createStore();
	store.set(everSiPanelOpenAtom, true);
	if (width !== undefined) {
		store.set(everSiPanelWidthAtom, width);
	}
	return store;
}

function separator() {
	return screen.getByRole('separator', { name: 'chatView.RESIZE_ASSISTANT' });
}

function panelWidth() {
	return (document.getElementById('ever-si-panel') as HTMLElement).style.width;
}

function storedWidth() {
	return JSON.parse(localStorage.getItem(WIDTH_KEY) ?? 'null') as number | null;
}

/** jsdom has no PointerEvent: a mouse event under the pointer event's name carries clientX and button to React. */
function pointer(element: HTMLElement, type: 'pointerdown' | 'pointermove' | 'pointerup', clientX: number) {
	act(() => {
		element.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, clientX, button: 0 }));
	});
}

describe('Ever SI panel width', () => {
	it('stays between 320 px and 640 px, and never past half the window', () => {
		expect(maxEverSiPanelWidth(1920)).toBe(640);
		expect(maxEverSiPanelWidth(1024)).toBe(512);
		// A narrow desktop window still leaves the panel its minimum.
		expect(maxEverSiPanelWidth(600)).toBe(EVER_SI_PANEL_WIDTH.min);

		expect(clampEverSiPanelWidth(100, 1920)).toBe(320);
		expect(clampEverSiPanelWidth(900, 1920)).toBe(640);
		expect(clampEverSiPanelWidth(600, 1024)).toBe(512);
		expect(clampEverSiPanelWidth(450.4, 1920)).toBe(450);
	});

	it('falls back to the standard width for anything stored that is not a number', () => {
		expect(clampEverSiPanelWidth('wide', 1920)).toBe(EVER_SI_PANEL_WIDTH.default);
		expect(clampEverSiPanelWidth(Number.NaN, 1920)).toBe(EVER_SI_PANEL_WIDTH.default);
		expect(clampEverSiPanelWidth(null, 1920)).toBe(EVER_SI_PANEL_WIDTH.default);
	});

	it('reads the open state and width this browser remembered on the first render', () => {
		localStorage.setItem('ever-si-panel-open', 'true');
		localStorage.setItem(WIDTH_KEY, '480');
		jest.isolateModules(() => {
			const atoms = jest.requireActual<typeof import('./atoms/ever-si-panel.atom')>('./atoms/ever-si-panel.atom');
			const store = createStore();
			expect(store.get(atoms.everSiPanelOpenAtom)).toBe(true);
			expect(store.get(atoms.everSiPanelWidthAtom)).toBe(480);
		});
	});
});

describe('Ever SI panel', () => {
	beforeEach(() => {
		localStorage.clear();
		mockNavigation.pathname = '/en/dashboard';
		mockSidebar.isMobile = false;
		// jsdom's window is 1024 px wide: the panel may take up to 512 px.
		Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1024 });
	});

	it('shows nothing while closed', () => {
		renderPanel();

		expect(screen.queryByTestId('ever-si-body')).toBeNull();
		expect(screen.queryByRole('separator')).toBeNull();
	});

	it('opens between the sidebar and the page at the remembered width, named Ever SI', () => {
		renderPanel(openStore(448));

		const panel = screen.getByRole('complementary', { name: 'chatView.ASSISTANT' });
		expect(panel.id).toBe('ever-si-panel');
		expect(panelWidth()).toBe('448px');
		expect(separator().getAttribute('aria-orientation')).toBe('vertical');
		expect(separator().getAttribute('aria-controls')).toBe('ever-si-panel');
		expect(separator().getAttribute('aria-valuenow')).toBe('448');
		expect(separator().getAttribute('aria-valuemin')).toBe('320');
		expect(separator().getAttribute('aria-valuemax')).toBe('512');
	});

	it('clamps a width remembered from a wider window to this one', () => {
		renderPanel(openStore(640));

		expect(panelWidth()).toBe('512px');
	});

	it('moves with the Arrow keys and remembers the new width', () => {
		renderPanel(openStore(400));

		fireEvent.keyDown(separator(), { key: 'ArrowRight' });
		expect(panelWidth()).toBe('416px');
		expect(storedWidth()).toBe(416);

		fireEvent.keyDown(separator(), { key: 'ArrowLeft', shiftKey: true });
		expect(panelWidth()).toBe('352px');
		expect(storedWidth()).toBe(352);
	});

	it('goes to its bounds with Home and End, and never past them', () => {
		renderPanel(openStore(400));

		fireEvent.keyDown(separator(), { key: 'End' });
		expect(storedWidth()).toBe(512);
		fireEvent.keyDown(separator(), { key: 'ArrowRight' });
		expect(storedWidth()).toBe(512);

		fireEvent.keyDown(separator(), { key: 'Home' });
		expect(storedWidth()).toBe(320);
		fireEvent.keyDown(separator(), { key: 'ArrowLeft' });
		expect(storedWidth()).toBe(320);
	});

	it('follows a drag of its edge and remembers the width only when the drag ends', () => {
		renderPanel(openStore(400));

		pointer(separator(), 'pointerdown', 600);
		pointer(separator(), 'pointermove', 660);
		expect(panelWidth()).toBe('460px');
		expect(storedWidth()).toBe(400);

		pointer(separator(), 'pointerup', 660);
		expect(storedWidth()).toBe(460);
	});

	it('goes back to the standard width on a double-click', () => {
		renderPanel(openStore(500));

		fireEvent.doubleClick(separator());

		expect(panelWidth()).toBe(`${EVER_SI_PANEL_WIDTH.default}px`);
		expect(storedWidth()).toBe(EVER_SI_PANEL_WIDTH.default);
	});

	it('is not shown on the full page, where the page is Ever SI', () => {
		mockNavigation.pathname = '/en/assistant';

		renderPanel(openStore());

		expect(screen.queryByTestId('ever-si-body')).toBeNull();
	});

	it('is not shown to the visitors of a public team page', () => {
		renderPanel(openStore(), true);

		expect(screen.queryByTestId('ever-si-body')).toBeNull();
	});

	it('takes the whole screen on phones, without a resize edge', () => {
		mockSidebar.isMobile = true;

		renderPanel(openStore());

		expect(screen.getByRole('dialog').id).toBe('ever-si-panel');
		expect(screen.getByTestId('ever-si-body').textContent).toBe('chatView.ASSISTANT');
		expect(screen.queryByRole('separator')).toBeNull();
	});
});
