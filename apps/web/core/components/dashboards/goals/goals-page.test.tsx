/** @jest-environment jsdom */
import type { ReactNode } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { GoalsPageState } from '@/core/hooks/time-goals/use-goals-page';
import {
	ETimeGoalComparison,
	ETimeGoalPeriod,
	ETimeGoalScope,
	ETimeGoalState,
	type ITimeGoal,
	type ITimeGoalProgress
} from '@/core/types/interfaces/timesheet/time-goal';

let mockPage: GoalsPageState;

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string, values?: Record<string, unknown>) =>
		values && Object.keys(values).length > 0 ? `${key}:${JSON.stringify(values)}` : key,
	useLocale: () => 'en'
}));
jest.mock('jotai', () => ({ useAtomValue: () => true }));
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock('@/core/stores/timer/active-timer', () => ({ isTrackingEnabledState: 'tracking-enabled-atom' }));
jest.mock('@/core/components/layouts/default-layout', () => ({
	PageLayout: ({ children, mainHeaderSlot }: { children: ReactNode; mainHeaderSlot?: ReactNode }) => (
		<main>
			{mainHeaderSlot}
			{children}
		</main>
	)
}));
jest.mock('@/core/components/duplicated-components/breadcrumb', () => ({ Breadcrumb: () => null }));
jest.mock('./goal-dialog', () => ({
	GoalDialog: ({ open, mode, goal }: { open: boolean; mode: string; goal?: ITimeGoal | null }) =>
		open ? <div role="dialog">{`${mode}:${goal?.name ?? ''}`}</div> : null
}));
jest.mock('@/core/hooks/time-goals/use-goals-page', () => ({ useGoalsPage: () => mockPage }));

import { GoalsPage } from './goals-page';

const HOUR = 3600;

function goalOf(overrides: Partial<ITimeGoal>): ITimeGoal {
	return {
		id: 'goal',
		name: 'Goal',
		comparison: ETimeGoalComparison.AT_LEAST,
		targetHours: 20,
		period: ETimeGoalPeriod.WEEK,
		scope: ETimeGoalScope.EMPLOYEE,
		employeeId: 'marie',
		...overrides
	};
}

function rowOf(
	goal: ITimeGoal,
	trackedSeconds: number,
	state: ETimeGoalState,
	employeeId = 'marie'
): ITimeGoalProgress {
	return {
		goalId: goal.id,
		goal,
		employeeId,
		period: goal.period,
		startDate: '2026-11-09',
		endDate: '2026-11-15',
		timeZone: 'Europe/Paris',
		trackedSeconds,
		targetSeconds: goal.targetHours * HOUR,
		state
	};
}

const CLIENT_A = goalOf({
	id: 'client-a',
	name: 'Client A',
	organizationContacts: [{ id: 'client-a', name: 'Client A' }]
});
const CLIENT_A_ROW = rowOf(CLIENT_A, 12 * HOUR, ETimeGoalState.IN_PROGRESS);

function pageOf(overrides: Partial<GoalsPageState> = {}): GoalsPageState {
	return {
		availability: 'available',
		isLoading: false,
		showsError: false,
		retry: jest.fn(),
		isUpdating: false,
		isMemberUnknown: false,
		hasAnyGoal: true,
		period: ETimeGoalPeriod.WEEK,
		pickPeriod: jest.fn(),
		counts: { [ETimeGoalPeriod.DAY]: 1, [ETimeGoalPeriod.WEEK]: 1, [ETimeGoalPeriod.MONTH]: 0 },
		shownRange: { startDate: '2026-11-09', endDate: '2026-11-15' },
		ownRows: [CLIENT_A_ROW],
		managesTeam: false,
		teamName: 'Product',
		team: { groups: [], isLoading: false, isError: false, retry: jest.fn() },
		archivedGoals: [],
		mayChange: () => true,
		ownerLabelOf: () => null,
		archive: jest.fn().mockResolvedValue(CLIENT_A),
		restore: jest.fn().mockResolvedValue(CLIENT_A),
		owners: { canPickOthers: false, members: [], teamId: 'team-1', teamName: 'Product' },
		projects: [],
		clients: [],
		...overrides
	};
}

beforeEach(() => {
	mockPage = pageOf();
	// The notices' orb asks whether motion is reduced; jsdom has no matchMedia
	window.matchMedia = jest.fn().mockReturnValue({ matches: true }) as unknown as typeof window.matchMedia;
});

describe('GoalsPage', () => {
	it('shows 12 h of 20 h on Client A, in progress, for this week', () => {
		render(<GoalsPage />);

		const own = screen.getByRole('region', { name: 'dashboard.goals.YOUR_GOALS' });
		expect(within(own).getByText('Client A')).toBeTruthy();
		expect(within(own).getByText('dashboard.goals.FIGURE:{"tracked":"12h 0m","target":"20h"}')).toBeTruthy();
		expect(within(own).getByText('dashboard.goals.state.IN_PROGRESS')).toBeTruthy();
		expect(within(own).getByText('dashboard.goals.gap.TO_GO:{"duration":"8h 0m"}')).toBeTruthy();
	});

	it('switches between the goals of the day, the week and the month', () => {
		render(<GoalsPage />);

		fireEvent.click(screen.getByRole('tab', { name: /dashboard.goals.PERIOD_DAY/ }));

		expect(mockPage.pickPeriod).toHaveBeenCalledWith(ETimeGoalPeriod.DAY);
	});

	it('writes an at-most goal past its limit as exceeded, with the time over', () => {
		const meetings = goalOf({
			id: 'meetings',
			name: 'Meetings',
			comparison: ETimeGoalComparison.AT_MOST,
			targetHours: 2,
			period: ETimeGoalPeriod.DAY
		});
		mockPage = pageOf({
			period: ETimeGoalPeriod.DAY,
			ownRows: [rowOf(meetings, 2.5 * HOUR, ETimeGoalState.EXCEEDED)]
		});
		render(<GoalsPage />);

		expect(screen.getByText('dashboard.goals.state.EXCEEDED')).toBeTruthy();
		expect(screen.getByText('dashboard.goals.gap.OVER_LIMIT:{"duration":"0h 30m"}')).toBeTruthy();
	});

	it('says when the picked period holds no goal', () => {
		mockPage = pageOf({ period: ETimeGoalPeriod.MONTH, ownRows: [] });
		render(<GoalsPage />);

		expect(screen.getByText('dashboard.goals.EMPTY_MONTH')).toBeTruthy();
	});

	it('invites a person without goals to create one', () => {
		mockPage = pageOf({ hasAnyGoal: false, ownRows: [] });
		render(<GoalsPage />);

		const createButtons = screen.getAllByRole('button', { name: 'dashboard.goals.NEW_GOAL' });
		fireEvent.click(createButtons[createButtons.length - 1]);

		expect(screen.getByText('dashboard.goals.EMPTY_TITLE')).toBeTruthy();
		expect(screen.getByRole('dialog').textContent).toBe('create:');
	});

	it('shows a manager her members’ progress, grouped by member', () => {
		const paulRow = rowOf(
			goalOf({ id: 'support', name: 'Support', employeeId: 'paul' }),
			3 * HOUR,
			ETimeGoalState.IN_PROGRESS,
			'paul'
		);
		mockPage = pageOf({
			managesTeam: true,
			team: {
				groups: [{ person: { employeeId: 'paul', name: 'Paul', imageUrl: null }, rows: [paulRow] }],
				isLoading: false,
				isError: false,
				retry: jest.fn()
			}
		});
		render(<GoalsPage />);

		const team = screen.getByRole('region', { name: 'dashboard.goals.TEAM_GOALS' });
		const paul = within(team).getByRole('region', { name: 'Paul' });
		expect(within(paul).getByText('Support')).toBeTruthy();
		expect(within(paul).getByText('dashboard.goals.FIGURE:{"tracked":"3h 0m","target":"20h"}')).toBeTruthy();
	});

	it('shows a member no one else’s progress', () => {
		render(<GoalsPage />);

		expect(screen.queryByRole('region', { name: 'dashboard.goals.TEAM_GOALS' })).toBeNull();
	});

	it('offers no action on a goal the person may not change', () => {
		mockPage = pageOf({ mayChange: () => false });
		render(<GoalsPage />);

		expect(screen.queryByRole('button', { name: 'dashboard.goals.ACTIONS:{"name":"Client A"}' })).toBeNull();
	});

	it('restores an archived goal', () => {
		const archived = goalOf({ id: 'old', name: 'Old goal', isArchived: true });
		mockPage = pageOf({ archivedGoals: [archived] });
		render(<GoalsPage />);

		fireEvent.click(screen.getByRole('button', { name: 'dashboard.goals.SHOW' }));
		fireEvent.click(screen.getByRole('button', { name: 'dashboard.goals.RESTORE' }));

		expect(mockPage.restore).toHaveBeenCalledWith(archived);
	});

	it('says so on a platform without goals, and offers no New goal', () => {
		mockPage = pageOf({ availability: 'unavailable' });
		render(<GoalsPage />);

		expect(screen.getByText('dashboard.goals.UNAVAILABLE_TITLE')).toBeTruthy();
		expect(screen.queryByRole('button', { name: 'dashboard.goals.NEW_GOAL' })).toBeNull();
	});

	it('keeps the frame while loading, and offers a retry when a read failed', () => {
		mockPage = pageOf({ isLoading: true });
		const { container, unmount } = render(<GoalsPage />);
		expect(container.querySelector('[aria-busy="true"]')).toBeTruthy();
		unmount();

		mockPage = pageOf({ showsError: true });
		render(<GoalsPage />);
		fireEvent.click(screen.getByRole('button', { name: 'pages.unauthorized.TRY_AGAIN' }));
		expect(mockPage.retry).toHaveBeenCalled();
	});
});
