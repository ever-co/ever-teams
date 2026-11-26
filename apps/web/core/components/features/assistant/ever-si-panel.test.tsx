/** @jest-environment jsdom */
import type { ReactNode } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createStore, Provider } from 'jotai';
import { EverSiPanel } from './ever-si-panel';
import { everSiPanelOpenAtom, everSiPanelWidthAtom, everSiReturnPathAtom } from './atoms/ever-si-panel.atom';
import { everSiPanelModeOf } from './ever-si-panel-mode';
import { EVER_SI_PANEL_WIDTH, clampEverSiPanelWidth, maxEverSiPanelWidth } from './ever-si-panel-width';

const mockNavigation = { pathname: '/en/dashboard', query: '' };
const mockSidebar = { isMobile: false };

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string) => key
}));
jest.mock('next/navigation', () => ({
	usePathname: () => mockNavigation.pathname,
	useSearchParams: () => new URLSearchParams(mockNavigation.query),
	useRouter: () => ({ push: jest.fn() })
}));
jest.mock('next/link', () => ({
	__esModule: true,
	default: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
		<a href={href} {...props}>
			{children}
		</a>
	)
}));
// The chat body loads on demand in the app; here a stand-in shows where it goes, which title it gets, and passes
// on its header's two actions.
jest.mock('next/dynamic', () => ({
	__esModule: true,
	default: () =>
		function EverSiPanelBodyStub({
			title,
			onClose,
			onOpenFullPage
		}: {
			title: ReactNode;
			onClose: () => void;
			onOpenFullPage?: () => void;
		}) {
			return (
				<div>
					<div data-testid="ever-si-body">{title}</div>
					<button type="button" onClick={onClose}>
						header-close
					</button>
					<button type="button" onClick={onOpenFullPage}>
						header-full-page
					</button>
				</div>
			);
		}
}));
jest.mock('@/core/components/common/sidebar', () => ({
	useSidebar: () => mockSidebar
}));
// The scope watcher has its own test (use-ever-si-scope-watcher.test.tsx).
jest.mock('./hooks/use-ever-si-scope-watcher', () => ({
	useEverSiScopeWatcher: () => undefined
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
		expect(screen.queryByRole('button', { name: 'chatView.COLLAPSE_ASSISTANT' })).toBeNull();
		expect(screen.queryByRole('link', { name: 'chatView.OPEN_FULL_PAGE' })).toBeNull();
	});
});

describe('Ever SI sizes', () => {
	it('is the full page there, the panel when open, and its button on the sidebar otherwise', () => {
		expect(everSiPanelModeOf('/en/assistant', false)).toBe('expanded');
		expect(everSiPanelModeOf('/assistant', true)).toBe('expanded');
		expect(everSiPanelModeOf('/en/dashboard', true)).toBe('docked');
		expect(everSiPanelModeOf('/en/dashboard', false)).toBe('collapsed');
		expect(everSiPanelModeOf(null, false)).toBe('collapsed');
	});
});

describe('Ever SI panel edge', () => {
	function collapseButton() {
		return screen.getByRole('button', { name: 'chatView.COLLAPSE_ASSISTANT' });
	}

	function fullPageLink() {
		return screen.getByRole('link', { name: 'chatView.OPEN_FULL_PAGE' });
	}

	function isBefore(first: Node, second: Node) {
		return Boolean(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING);
	}

	beforeEach(() => {
		localStorage.clear();
		mockNavigation.pathname = '/en/dashboard';
		mockSidebar.isMobile = false;
		Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1024 });
		window.history.replaceState(null, '', '/en/dashboard');
	});

	it('carries collapse, the grip and the full page, in that order', () => {
		renderPanel(openStore());

		expect(collapseButton().getAttribute('aria-controls')).toBe('ever-si-panel');
		expect(collapseButton().getAttribute('aria-expanded')).toBe('true');
		expect(fullPageLink().getAttribute('href')).toBe('/assistant');
		expect(isBefore(collapseButton(), separator())).toBe(true);
		expect(isBefore(separator(), fullPageLink())).toBe(true);
	});

	it('collapses to the button on the sidebar, where the focus goes too', () => {
		const sidebarButton = document.createElement('button');
		sidebarButton.id = 'ever-si-open-button';
		document.body.append(sidebarButton);
		const frames: FrameRequestCallback[] = [];
		const requestFrame = jest.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
			frames.push(callback);
			return frames.length;
		});

		const store = renderPanel(openStore());
		fireEvent.click(collapseButton());

		expect(store.get(everSiPanelOpenAtom)).toBe(false);
		expect(screen.queryByTestId('ever-si-body')).toBeNull();
		expect(localStorage.getItem('ever-si-panel-open')).toBe('false');
		frames.forEach((frame) => frame(0));
		expect(document.activeElement).toBe(sidebarButton);

		requestFrame.mockRestore();
		sidebarButton.remove();
	});

	it("collapses from the header's close button the same way", () => {
		const store = renderPanel(openStore());

		fireEvent.click(screen.getByRole('button', { name: 'header-close' }));

		expect(store.get(everSiPanelOpenAtom)).toBe(false);
	});

	it('stays open when the person goes on to the full page, from the edge or from the header', () => {
		const store = renderPanel(openStore());

		fireEvent.click(fullPageLink());
		expect(store.get(everSiPanelOpenAtom)).toBe(true);

		fireEvent.click(screen.getByRole('button', { name: 'header-full-page' }));
		expect(store.get(everSiPanelOpenAtom)).toBe(true);
	});

	it('closes on phones when the person goes to the full page, so no sheet waits over the next page', () => {
		mockSidebar.isMobile = true;
		const store = renderPanel(openStore());

		fireEvent.click(screen.getByRole('button', { name: 'header-full-page' }));

		expect(store.get(everSiPanelOpenAtom)).toBe(false);
	});
});

describe("Ever SI's way back from the full page", () => {
	/** The app's router and the address bar move together: the hooks read one, the way back is taken from the other. */
	function goTo(pathname: string, query = '') {
		mockNavigation.pathname = pathname;
		mockNavigation.query = query;
		const search = query ? `?${query}` : '';
		window.history.replaceState(null, '', `${pathname}${search}`);
	}

	function panelIn(store: ReturnType<typeof createStore>) {
		return (
			<Provider store={store}>
				<EverSiPanel />
			</Provider>
		);
	}

	beforeEach(() => {
		localStorage.clear();
		mockSidebar.isMobile = false;
		Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1024 });
		goTo('/en/dashboard');
	});

	afterEach(() => {
		goTo('/en/dashboard');
	});

	it('is every page but the full page, whether the panel is open or not', () => {
		goTo('/en/dashboard', 'team=7');
		const store = renderPanel();
		expect(store.get(everSiReturnPathAtom)).toBe('/en/dashboard?team=7');

		cleanup();
		goTo('/en/assistant');
		const fullPageStore = renderPanel(openStore());
		expect(fullPageStore.get(everSiReturnPathAtom)).toBeNull();
	});

	it('follows a change of the query alone, so a filter or a tab chosen on the page is kept', () => {
		goTo('/en/projects');
		const store = createStore();
		const view = render(panelIn(store));
		expect(store.get(everSiReturnPathAtom)).toBe('/en/projects');

		goTo('/en/projects', 'archived=true');
		view.rerender(panelIn(store));
		expect(store.get(everSiReturnPathAtom)).toBe('/en/projects?archived=true');

		// Reached from the command palette, not from the panel: the way back is still the page as it was left.
		goTo('/en/assistant');
		view.rerender(panelIn(store));
		expect(store.get(everSiReturnPathAtom)).toBe('/en/projects?archived=true');
	});

	it('opens the panel under the full page however the person got there, so leaving it shows the panel', () => {
		goTo('/en/assistant');
		const store = createStore();
		const view = render(panelIn(store));

		expect(store.get(everSiPanelOpenAtom)).toBe(true);
		expect(localStorage.getItem('ever-si-panel-open')).toBe('true');
		expect(screen.queryByTestId('ever-si-body')).toBeNull();

		goTo('/en/tasks');
		view.rerender(panelIn(store));
		expect(screen.getByTestId('ever-si-body')).toBeTruthy();
	});

	it('leaves the panel closed under the full page on a phone, before the sidebar knows it is one', () => {
		// The sidebar's `isMobile` is false on the first render even on a phone: the window's width decides.
		Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 });
		goTo('/en/assistant');

		const store = renderPanel();

		expect(store.get(everSiPanelOpenAtom)).toBe(false);
	});

	it('leaves the panel closed under the full page for the visitors of a public team page', () => {
		goTo('/en/assistant');

		const store = renderPanel(createStore(), true);

		expect(store.get(everSiPanelOpenAtom)).toBe(false);
	});
});
