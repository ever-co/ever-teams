/** @jest-environment jsdom */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { toast } from 'sonner';
import { TDailyPlan } from '@/core/types/schemas';
import { PlanHeader } from './plan-header';

const mockUpdateDailyPlan = jest.fn();

// The component imports 'assets/svg', which the compiler resolves to this same file
jest.mock('@/assets/svg', () => ({
	EditPenBoxIcon: ({ onClick }: { onClick?: () => void }) => (
		<button type="button" data-testid="edit-planned-time" onClick={onClick} />
	),
	CheckCircleTickIcon: ({ onClick }: { onClick?: () => void }) => (
		<button type="button" data-testid="save-planned-time" onClick={onClick} />
	)
}));

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
	toast: { success: jest.fn(), error: jest.fn() }
}));

const plan: TDailyPlan = {
	id: 'plan-1',
	date: '2026-10-26T00:00:00.000Z',
	workTimePlanned: 2,
	status: 'open',
	employeeId: 'employee-1',
	tasks: []
};

function failedUpdateToast(error: string) {
	const serializedValues = JSON.stringify({ error });
	return `dailyPlan.toastMessages.PLAN_UPDATE_FAILED_WITH_ERROR ${serializedValues}`;
}

function savePlannedTime(value: string) {
	render(<PlanHeader plan={plan} planMode="Today Tasks" />);
	const editButton = screen.getByTestId('edit-planned-time');
	fireEvent.click(editButton);
	const plannedTimeInput = screen.getByRole('textbox');
	fireEvent.change(plannedTimeInput, { target: { value } });
	const saveButton = screen.getByTestId('save-planned-time');
	fireEvent.click(saveButton);
}

describe('PlanHeader planned time toasts', () => {
	it('translates the error for minutes of 60 or more', async () => {
		savePlannedTime('1:75');

		const expectedToast = failedUpdateToast('dailyPlan.toastMessages.MINUTES_OUT_OF_RANGE');
		await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expectedToast));
		expect(mockUpdateDailyPlan).not.toHaveBeenCalled();
	});

	it('translates the error for an input that is neither H:MM nor a decimal', async () => {
		savePlannedTime('abc');

		const expectedToast = failedUpdateToast('dailyPlan.toastMessages.INVALID_TIME_FORMAT');
		await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expectedToast));
		expect(mockUpdateDailyPlan).not.toHaveBeenCalled();
	});

	it('keeps the reason of a failed request, without an English "Error:" prefix', async () => {
		mockUpdateDailyPlan.mockRejectedValueOnce(new Error('Request failed with status code 403'));

		savePlannedTime('3:30');

		const expectedToast = failedUpdateToast('Request failed with status code 403');
		await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expectedToast));
		expect(mockUpdateDailyPlan).toHaveBeenCalledWith({ workTimePlanned: 3.5, employeeId: 'employee-1' }, 'plan-1');
	});
});
