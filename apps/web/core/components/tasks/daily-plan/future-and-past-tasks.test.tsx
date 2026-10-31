/** @jest-environment jsdom */

import React from 'react';
import moment from 'moment-timezone';
import { fireEvent, render, screen } from '@testing-library/react';
import { FutureTasks } from './future-tasks';
import { PastTasks } from './past-tasks';

let mockPlans: { id: string; date: string; tasks: [] }[] = [];

jest.mock('@/core/hooks/daily-plans/use-employee-daily-plans', () => ({
	useEmployeeDailyPlans: () => ({ employeeFuturePlans: mockPlans, employeePastPlans: mockPlans })
}));

jest.mock('@/core/hooks/daily-plans/use-daily-plan-task-order', () => ({
	useDailyPlanTaskOrder: (plans: unknown[] | undefined) => ({ dragPlans: plans ?? [], onDragEnd: jest.fn() })
}));

jest.mock('@/core/hooks/daily-plans/use-filter-date-range', () => ({
	filterDailyPlan: (_date: unknown, plans: unknown[]) => plans,
	filterDailyPlansByEmployee: (plans: unknown[]) => plans,
	filterDailyPlansByTasks: (plans: unknown[]) => plans
}));

jest.mock('@/core/hooks/daily-plans/use-date-range', () => ({ useDateRange: () => ({ date: undefined }) }));

// The table view keeps the open plans free of drag and drop
jest.mock('jotai', () => ({ useAtomValue: () => 'TABLE' }));

jest.mock('@/core/stores/common/header-tabs', () => ({ dailyPlanViewHeaderTabs: 'daily-plan-view' }));

jest.mock('@hello-pangea/dnd', () => ({
	DragDropContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
	Draggable: () => null,
	Droppable: () => null
}));

jest.mock('@/core/components/daily-plan', () => ({ EmptyPlans: () => null, PlanHeader: () => null }));

jest.mock('@/core/components/optimized-components', () => ({ LazyTaskCard: () => null }));

jest.mock('@/core/components/duplicated-components/separator', () => ({ HorizontalSeparator: () => null }));

jest.mock('../task-block-card', () => ({ __esModule: true, default: () => null }));

jest.mock('./table-view', () => ({ __esModule: true, default: () => null }));

// 10:00 on 15 October in the test zone, later than the day the test modules were loaded
const firstMorning = Date.parse('2026-10-15T08:00:00.000Z');
// 10:00 the day after
const nextMorning = Date.parse('2026-10-16T08:00:00.000Z');
let clock = firstMorning;

const isPlanOpen = (label: string) => {
	const planLabel = screen.getByText(label);
	const trigger = planLabel.closest('button');
	return trigger?.getAttribute('aria-expanded');
};

describe('Future Tasks and Past Tasks default open plan', () => {
	beforeAll(() => {
		// UTC+2 all year, so a plan saved at the time it was created can sit on the UTC day before its own
		moment.tz.setDefault('Africa/Lubumbashi');
		jest.spyOn(Date, 'now').mockImplementation(() => clock);
	});

	afterAll(() => {
		jest.restoreAllMocks();
		moment.tz.setDefault();
	});

	beforeEach(() => {
		clock = firstMorning;
	});

	it("opens tomorrow's plan of the current day", () => {
		mockPlans = [
			{ id: 'plan-tomorrow', date: '2026-10-16T00:00:00.000Z', tasks: [] },
			{ id: 'plan-later', date: '2026-10-20T00:00:00.000Z', tasks: [] }
		];
		render(<FutureTasks profile={{}} employeeId="employee-1" />);

		expect(isPlanOpen('Tomorrow (0)')).toBe('true');
		expect(isPlanOpen('Tuesday, October 20, 2026 (0)')).toBe('false');
	});

	it("opens tomorrow's plan saved with the time it was created at", () => {
		mockPlans = [{ id: 'plan-tomorrow', date: '2026-10-15T22:30:00.000Z', tasks: [] }];
		render(<FutureTasks profile={{}} employeeId="employee-1" />);

		expect(isPlanOpen('Tomorrow (0)')).toBe('true');
	});

	it("opens the new tomorrow's plan on a render after midnight", () => {
		mockPlans = [
			{ id: 'plan-16', date: '2026-10-16T00:00:00.000Z', tasks: [] },
			{ id: 'plan-17', date: '2026-10-17T00:00:00.000Z', tasks: [] }
		];
		const { rerender } = render(<FutureTasks profile={{}} employeeId="employee-1" />);
		expect(isPlanOpen('Saturday, October 17, 2026 (0)')).toBe('false');

		clock = nextMorning;
		mockPlans = [{ id: 'plan-17', date: '2026-10-17T00:00:00.000Z', tasks: [] }];
		rerender(<FutureTasks profile={{}} employeeId="employee-1" />);

		expect(isPlanOpen('Tomorrow (0)')).toBe('true');
	});

	it('keeps a plan the user closed on a later render the same day', () => {
		mockPlans = [{ id: 'plan-16', date: '2026-10-16T00:00:00.000Z', tasks: [] }];
		const { rerender } = render(<FutureTasks profile={{}} employeeId="employee-1" />);
		fireEvent.click(screen.getByText('Tomorrow (0)'));

		rerender(<FutureTasks profile={{}} employeeId="employee-1" />);

		expect(isPlanOpen('Tomorrow (0)')).toBe('false');
	});

	it("opens yesterday's plan of the current day", () => {
		mockPlans = [
			{ id: 'plan-yesterday', date: '2026-10-14T00:00:00.000Z', tasks: [] },
			{ id: 'plan-earlier', date: '2026-10-10T00:00:00.000Z', tasks: [] }
		];
		render(<PastTasks profile={{}} employeeId="employee-1" />);

		expect(isPlanOpen('Yesterday (0)')).toBe('true');
		expect(isPlanOpen('Saturday, October 10, 2026 (0)')).toBe('false');
	});

	it("opens yesterday's plan saved with the time it was created at", () => {
		mockPlans = [{ id: 'plan-yesterday', date: '2026-10-13T22:30:00.000Z', tasks: [] }];
		render(<PastTasks profile={{}} employeeId="employee-1" />);

		expect(isPlanOpen('Yesterday (0)')).toBe('true');
	});

	it("opens the new yesterday's plan on a render after midnight", () => {
		mockPlans = [{ id: 'plan-14', date: '2026-10-14T00:00:00.000Z', tasks: [] }];
		const { rerender } = render(<PastTasks profile={{}} employeeId="employee-1" />);

		clock = nextMorning;
		mockPlans = [
			{ id: 'plan-15', date: '2026-10-15T00:00:00.000Z', tasks: [] },
			{ id: 'plan-14', date: '2026-10-14T00:00:00.000Z', tasks: [] }
		];
		rerender(<PastTasks profile={{}} employeeId="employee-1" />);

		expect(isPlanOpen('Yesterday (0)')).toBe('true');
	});
});
