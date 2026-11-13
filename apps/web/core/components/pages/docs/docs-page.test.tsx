/** @jest-environment jsdom */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

jest.mock('next/navigation', () => ({
	useParams: () => ({ pageId: 'page-1' }),
	useRouter: () => ({ replace: jest.fn(), push: jest.fn() })
}));
jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
jest.mock('sonner', () => ({ toast: Object.assign(jest.fn(), { error: jest.fn(), success: jest.fn() }) }));
// The app's frame around the page: a control of its own, which the open drawer covers.
jest.mock('@/core/components/layouts/default-layout', () => ({
	PageLayout: ({ children }: { children: React.ReactNode }) => (
		<div>
			<button type="button">frame control</button>
			{children}
		</div>
	)
}));
jest.mock('@/core/components/common/empty-state', () => ({ AnimatedEmptyState: () => null }));
jest.mock('@/core/lib/helpers', () => ({ cn: (...names: unknown[]) => names.filter(Boolean).join(' ') }));
jest.mock('@/core/lib/utils/docs-enabled', () => ({ isDocsEnabled: () => true, isDocsImportEnabled: () => false }));
jest.mock('@/core/lib/utils/docs-export', () => ({ isInside: () => false }));
jest.mock('@/core/hooks/docs/use-docs-actions', () => ({ useDocsActions: () => ({}) }));
jest.mock('@/core/hooks/docs/use-docs-availability', () => ({ useDocsAvailability: () => 'available' }));
jest.mock('@/core/hooks/docs/use-docs-collaboration', () => ({
	useDocsSpaces: () => ({ available: false, teamSpaces: [] })
}));
jest.mock('@/core/hooks/docs/use-docs-favorites', () => ({
	useDocsFavorites: () => ({ favoriteIds: new Set(), isFavorite: () => false, toggleFavorite: jest.fn() })
}));
jest.mock('@/core/hooks/docs/use-docs-recent', () => ({
	useDocsExpanded: () => ({ expanded: new Set(), toggle: jest.fn(), setOpen: jest.fn(), expandAll: jest.fn() }),
	useDocsRecent: () => ({ recentIds: [], forget: jest.fn() })
}));
jest.mock('@/core/hooks/docs/use-docs-scope', () => ({ useDocsScope: () => null }));
jest.mock('@/core/hooks/docs/use-docs-tree', () => ({
	useDocsTree: () => ({ isLoading: false, pages: [], byId: new Map(), tree: [], retry: jest.fn() })
}));
jest.mock('@/core/hooks/docs/use-docs-live', () => ({ pagesWithUnsentLiveEdits: () => [] }));
jest.mock('@/core/hooks/docs/use-docs-zip-export', () => ({ useDocsZipExport: () => ({ run: jest.fn() }) }));
jest.mock('@/core/hooks/docs/use-docs-import', () => ({
	useDocsImportAvailability: () => ({ available: false, maxZipBytes: 0 }),
	useDocsImportRun: () => ({ inProgress: false, reset: jest.fn() })
}));
jest.mock('./docs-home', () => ({ DocsHome: () => null }));
jest.mock('./docs-icon-dialog', () => ({ DocsIconDialog: () => null }));
jest.mock('./docs-import-dialog', () => ({ DocsImportDialog: () => null }));
jest.mock('./docs-dialogs', () => ({ DocsMoveDialog: () => null, DocsNameDialog: () => null }));
jest.mock('./docs-trash', () => ({ DocsTrash: () => null }));
jest.mock('./docs-page-view', () => ({
	DocsPageView: ({ onOpenTree }: { onOpenTree: () => void }) => (
		<button type="button" onClick={onOpenTree}>
			open tree
		</button>
	)
}));
// The tree: its rows walk with the arrows, so only one of them is in the tab order.
jest.mock('./docs-tree-pane', () => ({
	DocsTreePane: () => (
		<div>
			<button type="button">new page</button>
			<a href="/docs/page-1" aria-current="page">
				open page
			</a>
			<a href="/docs/page-2" tabIndex={-1}>
				other page
			</a>
			<button type="button">search</button>
			<button type="button" tabIndex={-1}>
				row menu
			</button>
		</div>
	)
}));

import { DocsPage } from './docs-page';

function openDrawer() {
	render(<DocsPage view="page" />);
	const opener = screen.getByText('open tree');
	opener.focus();
	fireEvent.click(opener);
	return { opener, dialog: screen.getByRole('dialog') };
}

function pressTab(shiftKey = false) {
	const target = document.activeElement ?? document.body;
	const event = new KeyboardEvent('keydown', { key: 'Tab', shiftKey, bubbles: true, cancelable: true });
	target.dispatchEvent(event);
	return event;
}

describe('the tree drawer of a page on a phone', () => {
	it('takes the focus to the open page and back to its opener when it closes', () => {
		const { opener } = openDrawer();
		expect(document.activeElement).toBe(screen.getByText('open page'));
		fireEvent.keyDown(document.activeElement as Element, { key: 'Escape' });
		expect(screen.queryByRole('dialog')).toBeNull();
		expect(document.activeElement).toBe(opener);
	});

	it('keeps Tab inside the drawer: past its last control to its first', () => {
		openDrawer();
		screen.getByText('search').focus();
		const event = pressTab();
		expect(event.defaultPrevented).toBe(true);
		expect(document.activeElement).toBe(screen.getByText('new page'));
	});

	it('keeps Shift+Tab inside the drawer: before its first control to its last', () => {
		openDrawer();
		screen.getByText('new page').focus();
		const event = pressTab(true);
		expect(event.defaultPrevented).toBe(true);
		expect(document.activeElement).toBe(screen.getByText('search'));
	});

	it('leaves Tab to the browser between the controls inside the drawer', () => {
		openDrawer();
		screen.getByText('open page').focus();
		expect(pressTab().defaultPrevented).toBe(false);
	});

	it("brings a focus lost to the page, or left on the app's frame, back into the drawer", () => {
		openDrawer();
		(document.activeElement as HTMLElement).blur();
		expect(pressTab().defaultPrevented).toBe(true);
		expect(document.activeElement).toBe(screen.getByText('new page'));

		// The app's header stays above the backdrop: a click there leaves the focus on it.
		screen.getByText('frame control').focus();
		expect(pressTab().defaultPrevented).toBe(true);
		expect(document.activeElement).toBe(screen.getByText('new page'));
		screen.getByText('frame control').focus();
		pressTab(true);
		expect(document.activeElement).toBe(screen.getByText('search'));
	});

	it.each(['dialog', 'menu'])(
		'never takes the focus from a %s opened from the drawer (portaled out of it)',
		(role) => {
			openDrawer();
			const layer = document.createElement('div');
			layer.setAttribute('role', role);
			const control = document.createElement('button');
			layer.appendChild(control);
			document.body.appendChild(layer);
			control.focus();
			expect(pressTab().defaultPrevented).toBe(false);
			expect(document.activeElement).toBe(control);
			layer.remove();
		}
	);

	it('keeps its backdrop out of the tab order (a pointer closes the drawer there, Escape from the keyboard)', () => {
		openDrawer();
		const backdrop = screen.getByLabelText('docs.CLOSE');
		expect(backdrop.tabIndex).toBe(-1);
		fireEvent.click(backdrop);
		expect(screen.queryByRole('dialog')).toBeNull();
	});
});
