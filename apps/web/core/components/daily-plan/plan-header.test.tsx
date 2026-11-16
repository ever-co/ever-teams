/** @jest-environment jsdom */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { toast } from 'sonner';
import { TDailyPlan } from '@/core/types/schemas';
import { PlanHeader } from './plan-header';

const mockUpdateDailyPlan = jest.fn();
const mockUseGetTimeLogs = jest.fn<{ data: unknown[] }, unknown[]>(() => ({ data: [] }));

jest.mock('@/core/hooks', () => ({
	useAuthenticateUser: () => ({ isTeamManager: true }),
	useCanSeeActivityScreen: () => false
}));

jest.mock('@/core/hooks/daily-plans/use-update-daily-plan', () => ({
	useUpdateDailyPlan: () => ({ updateDailyPlan: mockUpdateDailyPlan, updateDailyPlanLoading: false })
}));

jest.mock('@/core/hooks/daily-plans/use-delete-daily-plan', () => ({
	useDeleteDailyPlan: () => ({ deleteDailyPlan: jest.fn(), deleteDailyPlanLoading: false })
}));

jest.mock('@/core/hooks/activities/time-logs/use-get-time-logs', () => ({
	useGetTimeLogs: (...args: unknown[]) => mockUseGetTimeLogs(...args)
}));

// A message is its key followed by its values, so English text in a toast stands out
jest.mock('next-intl', () => ({
	useTranslations: () => (key: string, values?: Record<string, unknown>) => {
		if (!values) {
			return key;
		}
		const serializedValues = JSON.stringify(values);
		return `${key} ${serializedValues}`;
	}
}));

jest.mock('sonner', () => ({
	toast: { success: jest.fn(), error: jest.fn(), warning: jest.fn() }
}));

const plan: TDailyPlan = {
	id: 'plan-1',
	date: '2026-10-26T00:00:00.000Z',
	workTimePlanned: 2,
	status: 'open',
	employeeId: 'employee-1',
	tasks: []
};

// The planned time is edited in a popover: open it from the field, type, then confirm with Enter
function savePlannedTime(value: string) {
	render(<PlanHeader plan={plan} planMode="Today Tasks" />);
	const plannedTimeField = screen.getByRole('button', { name: /^dailyPlan\.PLANNED_TIME/ });
	fireEvent.click(plannedTimeField);
	const plannedTimeInput = screen.getByRole('textbox', { name: 'dailyPlan.PLANNED_TIME' });
	fireEvent.change(plannedTimeInput, { target: { value } });
	fireEvent.keyDown(plannedTimeInput, { key: 'Enter' });
}

describe('PlanHeader planned time toasts', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('translates the error for minutes of 60 or more', async () => {
		savePlannedTime('1:75');

		await waitFor(() =>
			expect(toast.warning).toHaveBeenCalledWith('toasts.plans.HOURS_INVALID', { id: 'plan-hours-invalid' })
		);
		expect(mockUpdateDailyPlan).not.toHaveBeenCalled();
	});

	it('translates the error for an input that is neither H:MM nor a decimal', async () => {
		savePlannedTime('abc');

		await waitFor(() =>
			expect(toast.warning).toHaveBeenCalledWith('toasts.plans.HOURS_INVALID', { id: 'plan-hours-invalid' })
		);
		expect(mockUpdateDailyPlan).not.toHaveBeenCalled();
	});

	it('keeps the reason of a failed request, without an English "Error:" prefix', async () => {
		mockUpdateDailyPlan.mockRejectedValueOnce(new Error('Request failed with status code 403'));
		savePlannedTime('3:30');

		await waitFor(() => expect(toast.error).toHaveBeenCalled());
		const [title, options] = (toast.error as jest.Mock).mock.calls[0];
		expect(title).toBe('toasts.plans.SAVE_FAILED');
		expect(String(options.description)).not.toMatch(/^Error:/);
		expect(mockUpdateDailyPlan).toHaveBeenCalledWith({ workTimePlanned: 3.5, employeeId: 'employee-1' }, 'plan-1');
	});
});

describe('PlanHeader worked time of the plan owner (#5351)', () => {
	const task = (id: string) => ({ id }) as NonNullable<TDailyPlan['tasks']>[number];

	beforeEach(() => {
		mockUseGetTimeLogs.mockClear();
	});

	it("reads only the plan owner's logs on the plan's tasks, not every member's", () => {
		render(<PlanHeader plan={{ ...plan, tasks: [task('task-a')] }} planMode="Today Tasks" />);

		const [params, options] = mockUseGetTimeLogs.mock.calls.at(-1) as [
			{ employeeIds?: string[]; taskIds: string[] },
			{ enabled?: boolean }
		];
		expect(params.employeeIds).toEqual(['employee-1']);
		expect(params.taskIds).toEqual(['task-a']);
		expect(options.enabled).not.toBe(false);
	});

	it('shows no worked time once the plan has no task left, whatever the last read holds or says', () => {
		const workedFigure = () => screen.getByText('common.WORKED').parentElement?.textContent ?? '';
		mockUseGetTimeLogs.mockReturnValue({ data: [{ duration: 3600 }] });
		const { rerender } = render(<PlanHeader plan={{ ...plan, tasks: [task('task-a')] }} planMode="Today Tasks" />);
		expect(workedFigure()).toContain('1h 0m');

		// The read kept from the plan with a task, still loading or failed, must not stand for the empty plan
		mockUseGetTimeLogs.mockReturnValue({ data: [{ duration: 3600 }], isLoading: true, isError: true } as never);
		rerender(<PlanHeader plan={{ ...plan, tasks: [] }} planMode="Today Tasks" />);

		expect(workedFigure()).toContain('0h 0m');
		mockUseGetTimeLogs.mockReturnValue({ data: [] });
	});

	it('reads nothing for a plan without tasks, whose worked time is none', () => {
		render(<PlanHeader plan={{ ...plan, tasks: [] }} planMode="Today Tasks" />);

		const [, options] = mockUseGetTimeLogs.mock.calls.at(-1) as [unknown, { enabled?: boolean }];
		expect(options.enabled).toBe(false);
	});
});

describe('PlanHeader worked time', () => {
	const task = (id: string) => ({ id }) as NonNullable<TDailyPlan['tasks']>[number];

	it('reads the logs of the same tasks whatever their order in the plan, so a reorder reads nothing again', () => {
		const { rerender } = render(
			<PlanHeader plan={{ ...plan, tasks: [task('task-b'), task('task-a')] }} planMode="Today Tasks" />
		);
		rerender(<PlanHeader plan={{ ...plan, tasks: [task('task-a'), task('task-b')] }} planMode="Today Tasks" />);

		const taskIdsRead = mockUseGetTimeLogs.mock.calls.map(([params]) => (params as { taskIds: string[] }).taskIds);
		expect(taskIdsRead.at(0)).toEqual(['task-a', 'task-b']);
		expect(taskIdsRead.at(-1)).toEqual(['task-a', 'task-b']);
	});
});
