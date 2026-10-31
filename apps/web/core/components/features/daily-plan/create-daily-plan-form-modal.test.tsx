/** @jest-environment jsdom */

import React from 'react';
import moment from 'moment';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { EDailyPlanMode } from '@/core/types/generics/enums/daily-plan';
import { CreateDailyPlanFormModal } from './create-daily-plan-form-modal';

const mockCreateDailyPlan = jest.fn();
const mockCloseModal = jest.fn();
// The day the calendar stand-in hands to the form when it is clicked
let mockPickedDay: Date | undefined;

jest.mock('@/core/hooks/daily-plans/use-employee-daily-plans', () => ({
	useEmployeeDailyPlans: () => ({ employeeDailyPlans: { items: [] } })
}));

jest.mock('@/core/hooks/daily-plans/use-create-daily-plan', () => ({
	useCreateDailyPlan: () => ({ createDailyPlan: mockCreateDailyPlan, createDailyPlanLoading: false })
}));

jest.mock('@/core/hooks/queries/user-user.query', () => ({
	useUserQuery: () => ({
		data: { id: 'user-1', tenantId: 'tenant-1', employee: { organizationId: 'organization-1' } }
	})
}));

jest.mock('jotai', () => ({ useAtomValue: () => [] }));

jest.mock('@/core/stores', () => ({
	activeTeamManagersState: 'active-team-managers',
	activeTeamState: 'active-team'
}));

jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));

jest.mock('@/core/components', () => {
	const Text = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
	Text.Heading = ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>;
	// Like the real modal, the content is unmounted while the modal is closed
	const Modal = ({ isOpen, children }: { isOpen: boolean; children: React.ReactNode }) => {
		if (!isOpen) {
			return null;
		}
		return <>{children}</>;
	};

	return { Modal, Text };
});

jest.mock('@/core/components/common/ever-card', () => ({
	EverCard: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

jest.mock('@/core/components/common/calendar', () => ({
	Calendar: ({ selected, onSelect }: { selected: Date; onSelect: (day: Date | undefined) => void }) => (
		<>
			<output data-testid="selected-day">{moment(selected).format('YYYY-MM-DD')}</output>
			<button type="button" onClick={() => onSelect(mockPickedDay)}>
				pick day
			</button>
		</>
	)
}));

let clock = 0;
const setClock = (date: Date) => {
	clock = date.getTime();
};

const planForm = (open: boolean) => (
	<CreateDailyPlanFormModal
		open={open}
		closeModal={mockCloseModal}
		taskId="task-1"
		employeeId="employee-1"
		planMode={EDailyPlanMode.CUSTOM}
	/>
);

const selectedDay = () => screen.getByTestId('selected-day').textContent;

const pickDay = (day: Date) => {
	mockPickedDay = day;
	fireEvent.click(screen.getByText('pick day'));
};

const submitForm = () => {
	const selected = screen.getByTestId('selected-day');
	const form = selected.closest('form');
	fireEvent.submit(form!);
};

describe('CreateDailyPlanFormModal across midnight', () => {
	beforeAll(() => {
		jest.spyOn(Date, 'now').mockImplementation(() => clock);
	});

	afterAll(() => {
		jest.restoreAllMocks();
	});

	beforeEach(() => {
		mockCreateDailyPlan.mockResolvedValue(undefined);
		mockPickedDay = undefined;
		// The main button follows the last option chosen, which the form keeps in localStorage
		window.localStorage.clear();
	});

	it('preselects tomorrow when a form mounted the day before is opened', () => {
		setClock(new Date(2026, 9, 14, 10, 0));
		const { rerender } = render(planForm(false));

		setClock(new Date(2026, 9, 15, 10, 0));
		rerender(planForm(true));

		expect(selectedDay()).toBe('2026-10-16');
	});

	it('keeps an upcoming day picked before the form was closed', () => {
		setClock(new Date(2026, 9, 14, 10, 0));
		const { rerender } = render(planForm(true));
		pickDay(new Date(2026, 9, 20));

		rerender(planForm(false));
		rerender(planForm(true));

		expect(selectedDay()).toBe('2026-10-20');
	});

	it('ignores yesterday picked in a calendar left open past midnight', () => {
		setClock(new Date(2026, 9, 14, 23, 50));
		render(planForm(true));

		setClock(new Date(2026, 9, 15, 0, 10));
		pickDay(new Date(2026, 9, 14));

		expect(selectedDay()).toBe('2026-10-15');
	});

	it('does not plan a day that passed while the form stayed open', async () => {
		setClock(new Date(2026, 9, 14, 23, 50));
		render(planForm(true));
		pickDay(new Date(2026, 9, 14));
		expect(selectedDay()).toBe('2026-10-14');

		setClock(new Date(2026, 9, 15, 0, 10));
		submitForm();

		await waitFor(() => expect(selectedDay()).toBe('2026-10-16'));
		expect(mockCreateDailyPlan).not.toHaveBeenCalled();
	});

	it('keeps the form open when Select & close meets a day that passed', async () => {
		setClock(new Date(2026, 9, 14, 23, 50));
		render(planForm(true));
		pickDay(new Date(2026, 9, 14));

		setClock(new Date(2026, 9, 15, 0, 10));
		fireEvent.click(screen.getByText('common.SELECT_AND_CLOSE'));

		await waitFor(() => expect(selectedDay()).toBe('2026-10-16'));
		expect(mockCloseModal).not.toHaveBeenCalled();
		expect(mockCreateDailyPlan).not.toHaveBeenCalled();
	});

	it('closes the form with Select & close on an upcoming day', async () => {
		setClock(new Date(2026, 9, 14, 10, 0));
		render(planForm(true));

		fireEvent.click(screen.getByText('common.SELECT_AND_CLOSE'));

		expect(mockCloseModal).toHaveBeenCalledTimes(1);
		await waitFor(() => expect(mockCreateDailyPlan).toHaveBeenCalledTimes(1));
	});

	it('plans the selected day while it is still upcoming', async () => {
		setClock(new Date(2026, 9, 14, 10, 0));
		render(planForm(true));

		submitForm();

		await waitFor(() =>
			expect(mockCreateDailyPlan).toHaveBeenCalledWith(
				expect.objectContaining({ date: '2026-10-15', taskId: 'task-1', employeeId: 'employee-1' })
			)
		);
	});
});
