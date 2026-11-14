/** @jest-environment jsdom */
import { renderHook } from '@testing-library/react';
import {
	ETimeGoalComparison,
	ETimeGoalPeriod,
	ETimeGoalScope,
	ETimeGoalState,
	type ITimeGoal,
	type ITimeGoalProgress
} from '@/core/types/interfaces/timesheet/time-goal';

const GOAL: ITimeGoal = {
	id: 'client-a',
	name: 'Client A',
	comparison: ETimeGoalComparison.AT_LEAST,
	targetHours: 20,
	period: ETimeGoalPeriod.WEEK,
	scope: ETimeGoalScope.EMPLOYEE,
	employeeId: 'marie'
};

const ROW: ITimeGoalProgress = {
	goalId: GOAL.id,
	goal: GOAL,
	employeeId: 'marie',
	period: ETimeGoalPeriod.WEEK,
	startDate: '2026-11-09',
	endDate: '2026-11-15',
	timeZone: 'Europe/Paris',
	trackedSeconds: 12 * 3600,
	targetSeconds: 20 * 3600,
	state: ETimeGoalState.IN_PROGRESS
};

let mockActiveGoals: ITimeGoal[] = [];
let mockProgressRows: ITimeGoalProgress[] = [];

jest.mock('@/core/hooks/queries/user-user.query', () => ({
	useUserQuery: () => ({ data: { id: 'user-marie', employee: { id: 'marie' } } })
}));
jest.mock('@/core/hooks/time-goals/use-time-goals', () => ({
	useTimeGoals: () => ({ availability: 'available', activeGoals: mockActiveGoals }),
	// The cache keeps the last progress it read, even once the read is turned off
	useTimeGoalProgress: () => ({ rows: mockProgressRows })
}));

import { useMyWeekGoals } from './use-my-week-goals';

describe('useMyWeekGoals', () => {
	it('shows the person’s progress against their active goals', () => {
		mockActiveGoals = [GOAL];
		mockProgressRows = [ROW];

		const { result } = renderHook(() => useMyWeekGoals(true));

		expect(result.current).toEqual({ rows: [ROW], isShown: true });
	});

	it('shows nothing once the last goal is archived, even with progress read before', () => {
		mockActiveGoals = [];
		mockProgressRows = [ROW];

		const { result } = renderHook(() => useMyWeekGoals(true));

		expect(result.current.isShown).toBe(false);
	});
});
