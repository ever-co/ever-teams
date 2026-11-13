/**
 * @jest-environment jsdom
 */
import React from 'react';
import { act, render, screen } from '@testing-library/react';

let mockPathname = '/views';

jest.mock('next/navigation', () => ({ usePathname: () => mockPathname }));
jest.mock('@/core/hooks/common/use-mobile', () => ({ useIsMobile: () => true }));

import { SidebarProvider, useSidebar } from './sidebar';

function MobileState() {
	const { openMobile, setOpenMobile, toggleSidebar } = useSidebar();
	return (
		<>
			<span data-testid="state">{openMobile ? 'open' : 'closed'}</span>
			<button type="button" onClick={() => setOpenMobile(true)}>
				open
			</button>
			<button type="button" onClick={toggleSidebar}>
				toggle
			</button>
		</>
	);
}

function renderSidebar() {
	return render(
		<SidebarProvider>
			<MobileState />
		</SidebarProvider>
	);
}

describe('SidebarProvider on a phone', () => {
	beforeEach(() => {
		mockPathname = '/views';
	});

	it('closes the sheet once one of its links led to another page (a view, a project)', () => {
		const view = renderSidebar();
		act(() => screen.getByText('open').click());
		expect(screen.getByTestId('state').textContent).toBe('open');

		mockPathname = '/views/mine';
		view.rerender(
			<SidebarProvider>
				<MobileState />
			</SidebarProvider>
		);

		expect(screen.getByTestId('state').textContent).toBe('closed');

		// Back on the page it was opened on, it stays closed.
		mockPathname = '/views';
		view.rerender(
			<SidebarProvider>
				<MobileState />
			</SidebarProvider>
		);
		expect(screen.getByTestId('state').textContent).toBe('closed');
	});

	it('still opens and closes from its toggle on the same page', () => {
		renderSidebar();
		act(() => screen.getByText('toggle').click());
		expect(screen.getByTestId('state').textContent).toBe('open');
		act(() => screen.getByText('toggle').click());
		expect(screen.getByTestId('state').textContent).toBe('closed');
	});
});
