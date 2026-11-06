/** @jest-environment jsdom */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { toast } from 'sonner';
import { TDailyPlan } from '@/core/types/schemas';
import { PlanHeader } from './plan-header';

const mockUpdateDailyPlan = jest.fn();

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
	useGetTimeLogs: () => ({ data: [] })
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
