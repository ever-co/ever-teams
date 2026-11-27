/** @jest-environment jsdom */
import { cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createStore, Provider } from 'jotai';
import { everSiPanelOpenAtom } from '@/core/components/features/assistant/atoms/ever-si-panel.atom';
import { EverSiNavItem } from './ever-si-nav-item';

const mockNavigation = { pathname: '/en/dashboard' };
const mockSidebar = { isMobile: false, setOpenMobile: jest.fn() };

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string) => (key === 'chatView.ASSISTANT' ? 'Ever SI' : key)
}));
jest.mock('next/navigation', () => ({
	usePathname: () => mockNavigation.pathname
}));
jest.mock('next/link', () => ({
	__esModule: true,
	default: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
		<a href={href} {...props}>
			{children}
		</a>
	)
}));
// The sidebar's own parts are covered elsewhere: here they only need to render the row and pass its state on.
jest.mock('@/core/components/common/sidebar', () => ({
	useSidebar: () => mockSidebar,
	SidebarGroup: ({ children }: { children: ReactNode }) => <div>{children}</div>,
	SidebarMenu: ({ children }: { children: ReactNode }) => <ul>{children}</ul>,
	SidebarMenuItem: ({ children }: { children: ReactNode }) => <li>{children}</li>,
	SidebarMenuButton: ({
		asChild,
		isActive,
		tooltip,
		children,
		...props
	}: {
		asChild?: boolean;
		isActive?: boolean;
		tooltip?: string;
		children: ReactNode;
	}) => {
		if (asChild && isValidElement(children)) {
			return cloneElement(children as ReactElement<Record<string, unknown>>, {
				'data-active': isActive,
				'data-tooltip': tooltip
			});
		}
		return (
			<button data-active={isActive} data-tooltip={tooltip} {...props}>
				{children}
			</button>
		);
	}
}));

function renderRow(store = createStore(), publicTeam = false) {
	render(
		<Provider store={store}>
			<EverSiNavItem publicTeam={publicTeam} />
		</Provider>
	);
	return store;
}

describe('Ever SI sidebar row', () => {
	beforeEach(() => {
		localStorage.clear();
		mockNavigation.pathname = '/en/dashboard';
		// The row is the phone's way into Ever SI; on desktop the button on the sidebar's edge is.
		mockSidebar.isMobile = true;
		mockSidebar.setOpenMobile.mockClear();
	});

	it('is not in the desktop menu, on any page', () => {
		mockSidebar.isMobile = false;
		const { container } = render(
			<Provider store={createStore()}>
				<EverSiNavItem />
			</Provider>
		);
		expect(container.innerHTML).toBe('');

		cleanup();
		mockNavigation.pathname = '/en/assistant';
		renderRow();
		expect(screen.queryByRole('link')).toBeNull();
		expect(screen.queryByRole('button')).toBeNull();

		cleanup();
		mockNavigation.pathname = '/en/dashboard';
		renderRow(createStore(), true);
		expect(screen.queryByRole('link')).toBeNull();
	});

	it('is a button named Ever SI that controls the panel', () => {
		renderRow();

		const row = screen.getByRole('button', { name: 'Ever SI' });
		expect(row.getAttribute('aria-expanded')).toBe('false');
		expect(row.getAttribute('aria-controls')).toBe('ever-si-panel');
		// Its name stays when the sidebar shows icons only (the label hidden), and is the tooltip there
		expect(row.getAttribute('aria-label')).toBe('Ever SI');
		expect(row.getAttribute('data-tooltip')).toBe('Ever SI');
		expect(screen.queryByRole('link')).toBeNull();
	});

	it('opens the panel, looks active while it is open, and closes it again', () => {
		const store = renderRow();
		const row = screen.getByRole('button', { name: 'Ever SI' });

		fireEvent.click(row);
		expect(store.get(everSiPanelOpenAtom)).toBe(true);
		expect(row.getAttribute('aria-expanded')).toBe('true');
		expect(row.getAttribute('data-active')).toBe('true');
		// Remembered for the next visit
		expect(localStorage.getItem('ever-si-panel-open')).toBe('true');

		fireEvent.click(row);
		expect(store.get(everSiPanelOpenAtom)).toBe(false);
		expect(row.getAttribute('aria-expanded')).toBe('false');
		expect(row.getAttribute('data-active')).toBe('false');
	});

	it('closes the sidebar sheet on phones when it opens Ever SI full screen', () => {
		renderRow();

		fireEvent.click(screen.getByRole('button', { name: 'Ever SI' }));

		expect(mockSidebar.setOpenMobile).toHaveBeenCalledWith(false);
	});

	it('leaves the sidebar sheet alone when it closes Ever SI', () => {
		const store = createStore();
		store.set(everSiPanelOpenAtom, true);
		renderRow(store);

		fireEvent.click(screen.getByRole('button', { name: 'Ever SI' }));

		expect(store.get(everSiPanelOpenAtom)).toBe(false);
		expect(mockSidebar.setOpenMobile).not.toHaveBeenCalled();
	});

	it('is the current link on the full page, where there is no panel to open', () => {
		mockNavigation.pathname = '/en/assistant';
		renderRow();

		const link = screen.getByRole('link', { name: 'Ever SI' });
		expect(link.getAttribute('href')).toBe('/assistant');
		expect(link.getAttribute('aria-current')).toBe('page');
		expect(link.getAttribute('aria-label')).toBe('Ever SI');
		expect(screen.queryByRole('button')).toBeNull();
	});

	it('stays a link to the page for the visitors of a public team page', () => {
		const store = renderRow(createStore(), true);

		const link = screen.getByRole('link', { name: 'Ever SI' });
		fireEvent.click(link);
		expect(store.get(everSiPanelOpenAtom)).toBe(false);
	});
});
