/** @jest-environment jsdom */
import type { ReactNode } from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { ETaskViewVisibility, type ITaskView } from '@/core/types/interfaces/common/task-views';

const mockPush = jest.fn();
const mockRefetch = jest.fn();
const mockUpdateView = jest.fn();
const mockDeleteView = jest.fn();
let mockQuery: { views: ITaskView[]; isLoading: boolean; isError: boolean };

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string, values?: Record<string, unknown>) =>
		values && Object.keys(values).length > 0 ? `${key}:${JSON.stringify(values)}` : key,
	useLocale: () => 'en'
}));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('next/link', () => ({
	__esModule: true,
	default: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
		<a href={href} {...props}>
			{children}
		</a>
	)
}));
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock('@/core/components/layouts/default-layout', () => ({
	PageLayout: ({ children, mainHeaderSlot }: { children: ReactNode; mainHeaderSlot?: ReactNode }) => (
		<main>
			{mainHeaderSlot}
			{children}
		</main>
	)
}));
jest.mock('@/core/components/duplicated-components/breadcrumb', () => ({ Breadcrumb: () => null }));
jest.mock('@/core/lib/utils/task-views-enabled', () => ({ isTaskViewsEnabled: () => true }));
jest.mock('@/core/hooks/task-views/use-task-views-query', () => ({
	useTaskViewsQuery: () => ({ ...mockQuery, refetch: mockRefetch, enabled: true })
}));
jest.mock('@/core/hooks/task-views/use-task-view-actions', () => {
	class TaskViewConflictError extends Error {}
	return {
		TaskViewConflictError,
		useTaskViewActions: () => ({ updateView: mockUpdateView, deleteView: mockDeleteView })
	};
});

import { NEW_VIEW_PATH } from './use-new-view-request';
import { ViewsPage } from './views-page';

const VIEWS: ITaskView[] = [
	{
		id: 'v1',
		name: 'Bugs this sprint',
		visibility: ETaskViewVisibility.PERSONAL,
		updatedAt: '2026-11-09T10:00:00.000Z'
	},
	{
		id: 'v2',
		name: 'Design review',
		description: 'UI tasks waiting for a review',
		visibility: ETaskViewVisibility.SHARED,
		updatedAt: '2026-11-10T10:00:00.000Z'
	}
];

describe('ViewsPage', () => {
	beforeEach(() => {
		mockPush.mockReset();
		mockRefetch.mockReset();
		mockUpdateView.mockReset().mockResolvedValue({});
		mockDeleteView.mockReset().mockResolvedValue(undefined);
		mockQuery = { views: VIEWS, isLoading: false, isError: false };
		// The notices' orb asks whether motion is reduced; jsdom has no matchMedia
		window.matchMedia = jest.fn().mockReturnValue({ matches: true }) as unknown as typeof window.matchMedia;
	});

	it('shows each built-in view with the rule it lists by, and each saved view with who sees it', () => {
		render(<ViewsPage />);

		const thisWeek = screen.getByTestId('built-in-view-this-week');
		expect(thisWeek.getAttribute('href')).toBe('/views/this-week');
		expect(within(thisWeek).getByText('taskViews.RULE_THIS_WEEK')).toBeTruthy();
		const rows = screen.getAllByTestId('saved-view');
		expect(rows).toHaveLength(2);
		expect(within(rows[0]).getByText('taskViews.PERSONAL')).toBeTruthy();
		expect(within(rows[1]).getByText('UI tasks waiting for a review')).toBeTruthy();
		expect(within(rows[1]).getByText('taskViews.SHARED')).toBeTruthy();
		expect(within(rows[1]).getByText(/^taskViews\.UPDATED:/)).toBeTruthy();
	});

	it('searches and filters the saved views, and says when none matches', () => {
		render(<ViewsPage />);

		fireEvent.change(screen.getByLabelText('taskViews.SEARCH_PLACEHOLDER'), { target: { value: 'design' } });
		expect(screen.getAllByTestId('saved-view')).toHaveLength(1);

		fireEvent.change(screen.getByLabelText('taskViews.SEARCH_PLACEHOLDER'), { target: { value: 'roadmap' } });
		expect(screen.queryByTestId('saved-view')).toBeNull();
		fireEvent.click(screen.getByRole('button', { name: 'taskViews.CLEAR_SEARCH' }));

		expect(screen.getAllByTestId('saved-view')).toHaveLength(2);
	});

	it("starts a new view on the team's tasks with the dialog that names it", () => {
		render(<ViewsPage />);

		fireEvent.click(screen.getByTestId('views-new'));

		expect(mockPush).toHaveBeenCalledWith(NEW_VIEW_PATH);
		expect(NEW_VIEW_PATH).toBe('/team/tasks?saveView=1');
	});

	it('offers to create the first view when there is none yet', () => {
		mockQuery = { views: [], isLoading: false, isError: false };
		render(<ViewsPage />);

		const createButtons = screen.getAllByRole('button', { name: 'taskViews.NEW_VIEW' });
		fireEvent.click(createButtons[createButtons.length - 1]);

		expect(screen.getByText('taskViews.EMPTY_TITLE')).toBeTruthy();
		expect(mockPush).toHaveBeenCalledWith(NEW_VIEW_PATH);
	});

	it('says the views could not load, and loads them again on retry, instead of saying there are none', () => {
		mockQuery = { views: [], isLoading: false, isError: true };
		render(<ViewsPage />);

		expect(screen.queryByText('taskViews.EMPTY_TITLE')).toBeNull();
		act(() => {
			fireEvent.click(screen.getByRole('button', { name: 'pages.unauthorized.TRY_AGAIN' }));
		});
		expect(mockRefetch).toHaveBeenCalled();
	});
});
