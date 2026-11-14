/** @jest-environment jsdom */
import type { ReactNode } from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import {
	ETimeGoalComparison,
	ETimeGoalPeriod,
	ETimeGoalScope,
	type ITimeGoal
} from '@/core/types/interfaces/timesheet/time-goal';

const mockWrite = jest.fn();

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string, values?: Record<string, unknown>) =>
		values && Object.keys(values).length > 0 ? `${key}:${JSON.stringify(values)}` : key
}));
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock('@/core/hooks/time-goals/use-time-goals', () => ({
	useTimeGoalWrites: () => ({ write: mockWrite, isWriting: false })
}));
jest.mock('@/core/components/common/app-dialog', () => ({
	APP_DIALOG_BODY: '',
	APP_DIALOG_FOOTER: '',
	AppDialog: ({ open, children }: { open: boolean; children: ReactNode }) =>
		open ? <div role="dialog">{children}</div> : null,
	AppDialogHeader: ({ title }: { title: string }) => <h2>{title}</h2>
}));
jest.mock('@/core/components/projects/project-properties', () => ({
	PropertyRow: ({ label, children }: { label: string; children: ReactNode }) => (
		<section aria-label={label}>{children}</section>
	)
}));
// The menu's popover stands for a list of its options, each one a button that picks it
jest.mock('@/core/components/tasks/task-property-menu', () => ({
	TaskPropertyMenu: ({
		options,
		onSelect,
		triggerLabel
	}: {
		options: Array<{ key: string; value: string; label: string }>;
		onSelect: (value: string) => void;
		triggerLabel: string;
	}) => (
		<div role="menu" aria-label={triggerLabel}>
			{options.map((option) => (
				<button key={option.key} type="button" role="menuitem" onClick={() => onSelect(option.value)}>
					{option.label}
				</button>
			))}
		</div>
	)
}));

import { GoalDialog } from './goal-dialog';

const OWNERS = {
	canPickOthers: true,
	members: [{ employeeId: 'jules', name: 'Jules', imageUrl: null }],
	teamId: 'team-1',
	teamName: 'Product'
};

const ACTIVE_CLIENTS = [{ id: 'client-a', name: 'Client A' }];

function goalOf(overrides: Partial<ITimeGoal> = {}): ITimeGoal {
	return {
		id: 'goal-1',
		name: 'Old client hours',
		comparison: ETimeGoalComparison.AT_LEAST,
		targetHours: 20,
		period: ETimeGoalPeriod.WEEK,
		scope: ETimeGoalScope.EMPLOYEE,
		employeeId: 'marie',
		projects: [],
		organizationContacts: [],
		...overrides
	};
}

function renderDialog(props: { mode: 'create' | 'edit'; goal?: ITimeGoal | null; onClose?: () => void }) {
	const onClose = props.onClose ?? jest.fn();
	render(
		<GoalDialog
			open
			mode={props.mode}
			goal={props.goal ?? null}
			owners={OWNERS}
			projects={[]}
			clients={ACTIVE_CLIENTS}
			onClose={onClose}
		/>
	);
	return { onClose };
}

function clientsRow() {
	return screen.getByRole('region', { name: 'dashboard.goals.form.CLIENTS' });
}

async function save(label: string) {
	await act(async () => {
		fireEvent.click(screen.getByRole('button', { name: label }));
	});
}

beforeEach(() => {
	mockWrite.mockReset();
	mockWrite.mockImplementation(async () => goalOf());
});

describe('GoalDialog', () => {
	it('shows a client the goal counts that the active list no longer holds, and lets it be removed', async () => {
		const goal = goalOf({ organizationContacts: [{ id: 'client-old', name: 'Old client' }] });
		renderDialog({ mode: 'edit', goal });

		const row = clientsRow();
		expect(within(row).getByText('Old client')).toBeTruthy();
		expect(within(row).queryByText('dashboard.goals.form.ANY_CLIENT')).toBeNull();
		// The archived client is shown, but new picks stay limited to the active ones
		const menu = within(row).getByRole('menu');
		expect(within(menu).queryByText('Old client')).toBeNull();

		fireEvent.click(
			within(row).getByRole('button', { name: 'pages.projects.modals.removeItem:{"name":"Old client"}' })
		);
		expect(within(row).getByText('dashboard.goals.form.ANY_CLIENT')).toBeTruthy();
		await save('common.SAVE_CHANGES');

		expect(mockWrite).toHaveBeenCalledWith({
			kind: 'update',
			goalId: 'goal-1',
			input: expect.objectContaining({ organizationContactIds: [] })
		});
	});

	it('leaves the clients alone when an edit changes the hours only', async () => {
		const goal = goalOf({ organizationContacts: [{ id: 'client-old', name: 'Old client' }] });
		renderDialog({ mode: 'edit', goal });

		fireEvent.change(screen.getByRole('textbox', { name: 'dashboard.goals.form.HOURS_LABEL' }), {
			target: { value: '25' }
		});
		await save('common.SAVE_CHANGES');

		const [[write]] = mockWrite.mock.calls;
		expect(write.input.targetHours).toBe(25);
		expect(write.input).not.toHaveProperty('organizationContactIds');
		expect(write.input).not.toHaveProperty('projectIds');
	});

	it('keeps an unnamed client the goal counts under a placeholder name', () => {
		renderDialog({ mode: 'edit', goal: goalOf({ organizationContacts: [{ id: 'client-x', name: null }] }) });

		expect(within(clientsRow()).getByText('common.UNKNOWN')).toBeTruthy();
	});

	it('creates a goal for the whole team, with the client picked', async () => {
		const { onClose } = renderDialog({ mode: 'create' });

		fireEvent.change(screen.getByRole('textbox', { name: 'dashboard.goals.form.NAME_LABEL' }), {
			target: { value: 'Client A, 20 h a week' }
		});
		fireEvent.change(screen.getByRole('textbox', { name: 'dashboard.goals.form.HOURS_LABEL' }), {
			target: { value: '20' }
		});
		fireEvent.click(screen.getByRole('tab', { name: 'dashboard.goals.form.FOR_TEAM' }));
		fireEvent.click(within(clientsRow()).getByRole('menuitem', { name: 'Client A' }));
		await save('dashboard.goals.form.CREATE');

		expect(mockWrite).toHaveBeenCalledWith({
			kind: 'create',
			input: expect.objectContaining({
				name: 'Client A, 20 h a week',
				targetHours: 20,
				period: ETimeGoalPeriod.WEEK,
				scope: ETimeGoalScope.TEAM,
				organizationTeamId: 'team-1',
				organizationContactIds: ['client-a']
			})
		});
		expect(onClose).toHaveBeenCalled();
	});

	it('creates a goal for one member they pick', async () => {
		renderDialog({ mode: 'create' });

		fireEvent.change(screen.getByRole('textbox', { name: 'dashboard.goals.form.NAME_LABEL' }), {
			target: { value: 'Jules, 2 h a day' }
		});
		fireEvent.change(screen.getByRole('textbox', { name: 'dashboard.goals.form.HOURS_LABEL' }), {
			target: { value: '2' }
		});
		fireEvent.click(screen.getByRole('tab', { name: 'dashboard.goals.form.PER_DAY' }));
		fireEvent.click(screen.getByRole('tab', { name: 'dashboard.goals.form.FOR_MEMBER' }));
		fireEvent.click(screen.getByRole('menuitem', { name: 'Jules' }));
		await save('dashboard.goals.form.CREATE');

		expect(mockWrite).toHaveBeenCalledWith({
			kind: 'create',
			input: expect.objectContaining({
				period: ETimeGoalPeriod.DAY,
				scope: ETimeGoalScope.EMPLOYEE,
				employeeId: 'jules'
			})
		});
	});

	it('keeps the draft open, with the reason, when the platform refuses the save', async () => {
		mockWrite.mockRejectedValue({ response: { status: 403 } });
		const { onClose } = renderDialog({ mode: 'create' });

		fireEvent.change(screen.getByRole('textbox', { name: 'dashboard.goals.form.NAME_LABEL' }), {
			target: { value: 'Product, 30 h a week' }
		});
		fireEvent.change(screen.getByRole('textbox', { name: 'dashboard.goals.form.HOURS_LABEL' }), {
			target: { value: '30' }
		});
		await save('dashboard.goals.form.CREATE');

		expect(onClose).not.toHaveBeenCalled();
		expect(screen.getByRole('alert').textContent).toBe('dashboard.goals.form.FORBIDDEN');
		const name = screen.getByRole('textbox', { name: 'dashboard.goals.form.NAME_LABEL' }) as HTMLInputElement;
		expect(name.value).toBe('Product, 30 h a week');
	});

	it('does not send a draft without a name or hours', async () => {
		renderDialog({ mode: 'create' });

		await save('dashboard.goals.form.CREATE');

		expect(mockWrite).not.toHaveBeenCalled();
		const alerts = screen.getAllByRole('alert').map((alert) => alert.textContent);
		expect(alerts).toEqual(['dashboard.goals.form.NAME_REQUIRED', 'dashboard.goals.form.HOURS_REQUIRED']);
	});
});
