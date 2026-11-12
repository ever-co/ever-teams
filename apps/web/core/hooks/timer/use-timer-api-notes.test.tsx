/** @jest-environment jsdom */
/**
 * #5084: once a start is answered, the notes typed before it are tied to the entry it created. An answer that arrives
 * after the member changed team ties nothing: the draft that start sent was dropped at the change, and the notes typed
 * since are for the next team's start. Tied to the entry of the team left behind, they would be kept out of that
 * start and sent with the stop of an entry they were never written for.
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createStore, Provider } from 'jotai';
import type { PropsWithChildren } from 'react';

import { notesToSendAtStart, withoutTimerNotesDraft } from '@/core/lib/utils/timer/timer-notes';
import { activeTeamIdState, organizationTeamsState, timerNotesState, timerStatusState } from '@/core/stores';
import { ETimeLogSource } from '@/core/types/generics/enums/timer';
import type { TTask } from '@/core/types/schemas/task/task.schema';
import { useTimerApi } from './use-timer-api';

const TEAM_OF_START = 'team-1';
const OTHER_TEAM = 'team-2';
const STARTED_LOG_ID = 'log-team-1';

interface StartAnswer {
	data: {
		running: boolean;
		lastLog: { id: string; source: ETimeLogSource; organizationTeamId: string; description: string | null };
	};
}

/** The start request stays in flight until the test answers it. */
let answerStart: (answer: StartAnswer) => void = () => undefined;

const mockStartTimer = jest.fn(
	(_body: { description?: string }) =>
		new Promise<StartAnswer>((resolve) => {
			answerStart = resolve;
		})
);

const mockUser = {
	id: 'user-1',
	tenantId: 'tenant-1',
	isEmailVerified: true,
	employee: {
		id: 'employee-1',
		userId: 'user-1',
		organizationId: 'org-1',
		tenantId: 'tenant-1',
		isTrackingTime: false
	}
};
const mockRefreshUserData = jest.fn(async () => mockUser);
const mockTranslate = (key: string) => key;
const mockPlans = { myDailyPlans: { items: [] }, isSuccess: true };
const mockTaskStatuses = { taskStatuses: [] };
const mockTasksState = { setActiveTask: jest.fn(), isUpdatingActiveTask: false };
const mockEmployeeTeams = { updateOrganizationTeamEmployeeActiveTask: jest.fn(async () => undefined) };
const mockUpdateTask = { updateTask: jest.fn() };
const mockResolveBillable = jest.fn(async () => false);

jest.mock('next/navigation', () => ({ usePathname: () => '/' }));
jest.mock('next-intl', () => ({ useTranslations: () => mockTranslate, useLocale: () => 'en' }));
jest.mock('sonner', () => ({ toast: { info: jest.fn(), warning: jest.fn(), error: jest.fn() } }));
jest.mock('@/core/services/client/api/timers', () => ({
	timerService: {
		getTimerStatus: async () => ({ data: { running: false, lastLog: null } }),
		getLastTimerLog: async () => ({ data: [] }),
		syncTimer: async () => ({ data: null }),
		stopTimer: jest.fn(),
		startTimer: (body: { description?: string }) => mockStartTimer(body)
	}
}));
jest.mock('@/core/hooks/auth/use-authenticate-user', () => ({
	useAuthenticateUser: () => ({ user: mockUser, $user: { current: mockUser }, refreshUserData: mockRefreshUserData })
}));
jest.mock('@/core/hooks/daily-plans/use-my-daily-plans', () => ({ useMyDailyPlans: () => mockPlans }));
jest.mock('@/core/hooks/organizations/teams/use-organization-teams-employee', () => ({
	useOrganizationEmployeeTeams: () => mockEmployeeTeams
}));
jest.mock('@/core/hooks/organizations/teams/use-team-tasks-state', () => ({ useTeamTasksState: () => mockTasksState }));
jest.mock('@/core/hooks/organizations/teams/use-update-task', () => ({ useUpdateTask: () => mockUpdateTask }));
jest.mock('@/core/hooks/tasks/use-task-statuses-query', () => ({ useTaskStatusesQuery: () => mockTaskStatuses }));
jest.mock('./use-timer-billable', () => ({ useResolveTimerBillable: () => mockResolveBillable }));

const TASK = {
	id: 'task-1',
	title: 'Task',
	status: 'in-progress',
	organizationId: 'org-1',
	projectId: null
} as never as TTask;

const teamOf = (id: string) => ({ id, name: id, members: [], projects: [] });

/**
 * A timer of the first team, as a task card or the main timer mounts it (no scoped status of its own), with notes
 * typed for the next start. Start is pressed, and its request stays in flight.
 */
async function pressStartWithNotes(notes: string) {
	const store = createStore();
	store.set(organizationTeamsState, [teamOf(TEAM_OF_START), teamOf(OTHER_TEAM)] as never);
	store.set(activeTeamIdState, TEAM_OF_START);
	store.set(timerStatusState, { running: false, lastLog: null } as never);
	store.set(timerNotesState, { text: notes, timeLogId: null });
	const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	const wrapper = ({ children }: PropsWithChildren) => (
		<QueryClientProvider client={queryClient}>
			<Provider store={store}>{children}</Provider>
		</QueryClientProvider>
	);
	const { result, unmount } = renderHook(() => useTimerApi({ updateLocalTimerStatus: jest.fn(), firstLoad: false }), {
		wrapper
	});

	let start: Promise<unknown> = Promise.resolve();
	act(() => {
		start = Promise.resolve(result.current.startTimer(TASK));
	});
	await waitFor(() => expect(mockStartTimer).toHaveBeenCalledTimes(1));

	const answer = async () => {
		await act(async () => {
			answerStart({
				data: {
					running: true,
					lastLog: {
						id: STARTED_LOG_ID,
						source: ETimeLogSource.TEAMS,
						organizationTeamId: TEAM_OF_START,
						description: notes
					}
				}
			});
			await start;
		});
	};

	return { store, answer, unmount };
}

/** The member opens another team: the app drops the draft typed for the team left behind (`useScopeTransitionGuard`). */
function openOtherTeam(store: ReturnType<typeof createStore>) {
	act(() => {
		store.set(activeTeamIdState, OTHER_TEAM);
		store.set(timerNotesState, withoutTimerNotesDraft);
	});
}

function typeNotes(store: ReturnType<typeof createStore>, text: string) {
	act(() => {
		store.set(timerNotesState, (notes) => ({ ...notes, text }));
	});
}

describe('the notes once a start is answered', () => {
	beforeEach(() => {
		mockStartTimer.mockClear();
	});

	it('ties the notes typed while the start was in flight to the entry it created', async () => {
		const { store, answer } = await pressStartWithNotes('Fix the login page');
		expect(mockStartTimer).toHaveBeenCalledWith(expect.objectContaining({ description: 'Fix the login page' }));

		typeNotes(store, 'Fix the login page, then the sign-up form');
		await answer();

		expect(store.get(timerNotesState)).toEqual({
			text: 'Fix the login page, then the sign-up form',
			timeLogId: STARTED_LOG_ID
		});
	});

	it('leaves the notes typed after a team change to the next start of that team', async () => {
		const { store, answer } = await pressStartWithNotes('Fix the login page');

		openOtherTeam(store);
		typeNotes(store, 'Review the invoices');
		await answer();

		const notes = store.get(timerNotesState);
		expect(notes).toEqual({ text: 'Review the invoices', timeLogId: null });
		expect(notesToSendAtStart(notes)).toBe('Review the invoices');
	});

	it('does so when the timer that asked for the start is gone with the team left behind', async () => {
		const { store, answer, unmount } = await pressStartWithNotes('Fix the login page');

		// A task card of the first team: opening the other team takes it off the screen
		unmount();
		openOtherTeam(store);
		typeNotes(store, 'Review the invoices');
		await answer();

		expect(store.get(timerNotesState)).toEqual({ text: 'Review the invoices', timeLogId: null });
	});
});
