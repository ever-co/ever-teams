/**
 * @jest-environment jsdom
 */

/**
 * The task page used to show any failed load as "Task not found", or the task opened before, and to ask for the
 * task again each time the loading flag dropped, about once a second for as long as it stayed open. The page runs
 * here with the real useTaskQueries, so it meets the real loading flag and failure state.
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider, createStore } from 'jotai';
import type { PrimitiveAtom } from 'jotai';
import { ApiErrorService } from '@/core/services/client/api-error.service';
import { detailedTaskState } from '@/core/stores';
import type { TTask } from '@/core/types/schemas/task/task.schema';
import TaskDetailsPage from './page';

const TASK_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_TASK_ID = '22222222-2222-4222-8222-222222222222';
const ROUND_TRIP_MS = 10;
const KEEP_OPEN_MS = 20 * ROUND_TRIP_MS;

const mockGetTaskById = jest.fn();
const mockRouter = { replace: jest.fn() };
const mockParams = { id: TASK_ID };

type TEmptyStateProps = { title: string; message: string; actionLabel?: string; onAction?: () => void };

jest.mock('@/core/services/client/api', () => ({
	taskService: {
		getTaskById: (...args: unknown[]) => mockGetTaskById(...args)
	}
}));
jest.mock('@/core/stores', () => {
	const { atom } = jest.requireActual('jotai');
	return {
		activeTeamState: atom({ id: 'team-1', name: 'Fixture Team' }),
		detailedTaskState: atom(null),
		isTrackingEnabledState: atom(false),
		tasksByTeamState: atom([])
	};
});
jest.mock('@/core/hooks', () => ({
	useTaskQueries: jest.requireActual('@/core/hooks/organizations/teams/use-task-queries').useTaskQueries,
	useUserProfilePage: () => ({ isAuthUser: true, loadTaskStatsIObserverRef: undefined })
}));
jest.mock('@/core/hooks/organizations/teams/use-tasks-by-employee-query', () => ({
	useTasksByEmployeeQuery: () => ({ getTasksByEmployeeId: jest.fn(), getTasksByEmployeeIdLoading: false })
}));
jest.mock('@/core/hooks/bootstrap/use-feature-data', () => ({ useTeamDailyPlansOwner: jest.fn() }));
jest.mock('@/core/components/layouts/app/authenticator', () => ({
	withAuthentication: (Component: React.ComponentType) => Component
}));
jest.mock('next/navigation', () => ({
	useRouter: () => mockRouter,
	useParams: () => mockParams
}));
jest.mock('next-intl', () => {
	// The page parses its breadcrumb title as JSON
	function t(key: string) {
		if (key === 'pages.taskDetails.BREADCRUMB') {
			return '"Task"';
		}
		return key;
	}
	return { useTranslations: () => t };
});

jest.mock('@/core/components', () => ({
	Button: ({ children }: React.PropsWithChildren) => <button>{children}</button>,
	Container: ({ children }: React.PropsWithChildren) => <div>{children}</div>
}));
jest.mock('@/core/components/layouts/default-layout', () => ({
	PageLayout: ({ children }: React.PropsWithChildren) => <main>{children}</main>
}));
jest.mock('@/core/components/optimized-components', () => ({
	LazyTaskDetailsComponent: ({ task }: { task: TTask }) => <h1>{task.title}</h1>
}));
jest.mock('@/core/components/common/empty-state', () => ({
	AnimatedEmptyState: ({ title, message, actionLabel, onAction }: TEmptyStateProps) => (
		<section>
			<h2>{title}</h2>
			<p>{message}</p>
			<button onClick={onAction}>{actionLabel}</button>
		</section>
	)
}));
jest.mock('@/core/components/duplicated-components/breadcrumb', () => ({ Breadcrumb: () => null }));
jest.mock('@/core/components/common/skeleton/task-details-page-skeleton', () => ({
	TaskDetailsPageSkeleton: () => null
}));
jest.mock('assets/svg', () => ({ ArrowLeftIcon: () => null }), { virtual: true });
jest.mock('next/link', () => ({
	__esModule: true,
	default: ({ children, href }: React.PropsWithChildren<{ href: string }>) => <a href={href}>{children}</a>
}));

/** The app derives the team list from the team tasks; the store mock above makes it a plain atom a test can fill. */
type TStoresMock = { tasksByTeamState: PrimitiveAtom<TTask[]> };
const { tasksByTeamState } = jest.requireMock<TStoresMock>('@/core/stores');

/** What taskService.getTaskById rejects with when the API answers `status`: api.service.ts wraps the Axios error. */
function apiAnswered(status: number) {
	const response = { status, data: { statusCode: status, message: 'Refused' } };
	const message = `Request failed with status code ${status}`;
	return ApiErrorService.fromAxiosError({ message, code: 'ERR_BAD_REQUEST', status, response });
}

/** What it rejects with when the API cannot be reached (server stopped, connection refused). */
function apiUnreachable() {
	return ApiErrorService.fromAxiosError({ message: 'Network Error', code: 'ERR_NETWORK' });
}

/** Makes taskService.getTaskById fail like a real request: after a round trip, not in the same tick. */
function failEveryRequest(error: unknown) {
	mockGetTaskById.mockImplementation(
		() =>
			new Promise((_resolve, reject) => {
				setTimeout(() => reject(error), ROUND_TRIP_MS);
			})
	);
}

/** Renders the task page and returns a function that renders it again, as Next.js does when the route id changes. */
function renderTaskPage(store = createStore()) {
	const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
	const taskPage = () => (
		<QueryClientProvider client={client}>
			<Provider store={store}>
				<TaskDetailsPage />
			</Provider>
		</QueryClientProvider>
	);
	const view = render(taskPage());
	return () => view.rerender(taskPage());
}

/**
 * Leaves the page open for a while, as a user looking at it would. The test client does not retry, so a page that
 * asks again after each failure does it every round trip here, instead of about once a second in the app.
 */
async function keepPageOpen() {
	await new Promise((resolve) => setTimeout(resolve, KEEP_OPEN_MS));
}

describe('task page load failures', () => {
	beforeEach(() => {
		jest.spyOn(console, 'error').mockImplementation(() => undefined);
	});

	afterEach(() => {
		mockParams.id = TASK_ID;
		jest.restoreAllMocks();
	});

	it('shows a failed load as an error and asks for the task again only from Try again', async () => {
		failEveryRequest(apiUnreachable());

		renderTaskPage();

		await screen.findByText('pages.error.HEADING_TITLE');
		await keepPageOpen();
		expect(mockGetTaskById).toHaveBeenCalledTimes(1);
		expect(screen.queryByText('Task not found')).toBeNull();

		mockGetTaskById.mockResolvedValue({ id: TASK_ID, title: 'Fixture task' });
		const tryAgain = screen.getByText('pages.unauthorized.TRY_AGAIN');
		fireEvent.click(tryAgain);

		await screen.findByText('Fixture task');
		expect(mockGetTaskById).toHaveBeenCalledTimes(2);
	});

	// The failure only holds back the task it was recorded for: opening another task loads it on its own
	it('loads the next task on its own when the route moves on from a failed one', async () => {
		failEveryRequest(apiUnreachable());
		const rerenderTaskPage = renderTaskPage();
		await screen.findByText('pages.error.HEADING_TITLE');

		mockGetTaskById.mockResolvedValue({ id: OTHER_TASK_ID, title: 'Next task' });
		mockParams.id = OTHER_TASK_ID;
		rerenderTaskPage();

		await screen.findByText('Next task');
		expect(mockGetTaskById).toHaveBeenCalledTimes(2);
		expect(mockGetTaskById).toHaveBeenLastCalledWith(OTHER_TASK_ID);
		expect(screen.queryByText('pages.error.HEADING_TITLE')).toBeNull();
	});

	it.each([
		['a task that does not exist', 404],
		['an id that is not a UUID', 406]
	])('shows Task not found for %s and asks for it once', async (_case, status) => {
		failEveryRequest(apiAnswered(status));

		renderTaskPage();

		await screen.findByText('Task not found');
		await keepPageOpen();
		expect(mockGetTaskById).toHaveBeenCalledTimes(1);
		expect(screen.getByText('Task not found')).toBeTruthy();
		expect(screen.queryByText('pages.error.HEADING_TITLE')).toBeNull();
	});

	it('does not show the task opened before when this one fails to load', async () => {
		const store = createStore();
		const taskOpenedBefore = { id: OTHER_TASK_ID, title: 'Task opened before' } as TTask;
		store.set(detailedTaskState, taskOpenedBefore);
		failEveryRequest(apiUnreachable());

		renderTaskPage(store);

		await screen.findByText('pages.error.HEADING_TITLE');
		expect(screen.queryByText('Task opened before')).toBeNull();
	});

	// getTaskById puts the team list copy of the task in the store before asking for the full one
	it.each([
		['a failed load as an error', apiUnreachable(), 'pages.error.HEADING_TITLE'],
		['a deleted task as Task not found', apiAnswered(404), 'Task not found']
	])('shows %s when the team list still holds the task', async (_case, error, shownText) => {
		const store = createStore();
		const teamListCopy = { id: TASK_ID, title: 'Team list copy' } as TTask;
		store.set(tasksByTeamState, [teamListCopy]);
		failEveryRequest(error);

		renderTaskPage(store);

		await screen.findByText(shownText);
		expect(screen.queryByText('Team list copy')).toBeNull();
	});
});
