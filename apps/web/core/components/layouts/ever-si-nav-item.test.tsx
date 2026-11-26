/** @jest-environment jsdom */
import { cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
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
		mockSidebar.isMobile = false;
	});

	it('is a button named Ever SI that controls the panel', () => {
		renderRow();

		const row = screen.getByRole('button', { name: 'Ever SI' });
		expect(row.getAttribute('aria-expanded')).toBe('false');
		expect(row.getAttribute('aria-controls')).toBe('ever-si-panel');
		// Its name is the tooltip of the icon-only sidebar
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
		mockSidebar.isMobile = true;
		renderRow();

		fireEvent.click(screen.getByRole('button', { name: 'Ever SI' }));

		expect(mockSidebar.setOpenMobile).toHaveBeenCalledWith(false);
	});

	it('leaves the sidebar sheet alone on desktop', () => {
		renderRow();

		fireEvent.click(screen.getByRole('button', { name: 'Ever SI' }));

		expect(mockSidebar.setOpenMobile).not.toHaveBeenCalled();
	});

	it('is the current link on the full page, where there is no panel to open', () => {
		mockNavigation.pathname = '/en/assistant';
		renderRow();

		const link = screen.getByRole('link', { name: 'Ever SI' });
		expect(link.getAttribute('href')).toBe('/assistant');
		expect(link.getAttribute('aria-current')).toBe('page');
		expect(screen.queryByRole('button')).toBeNull();
	});

	it('stays a link to the page for the visitors of a public team page', () => {
		const store = renderRow(createStore(), true);

		const link = screen.getByRole('link', { name: 'Ever SI' });
		fireEvent.click(link);
		expect(store.get(everSiPanelOpenAtom)).toBe(false);
	});
});
