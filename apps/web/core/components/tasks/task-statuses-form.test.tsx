/** @jest-environment jsdom */
import type { InputHTMLAttributes, ReactNode, Ref } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { TaskStatusesForm } from './task-statuses-form';

/**
 * The icon field of the status form (#5024 review). The picker shows the icon the form holds: a status type brings
 * its icon once, an icon picked after it survives later renders, and a reset after a create clears the picker too.
 */
const mockCreateTaskStatus = jest.fn();
const mockEditTaskStatus = jest.fn();
const mockStatuses: never[] = [];

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string) => key
}));
jest.mock('@/core/hooks', () => ({
	useModal: () => ({ isOpen: false, openModal: jest.fn(), closeModal: jest.fn() }),
	useRefetchData: () => ({ refetch: jest.fn() })
}));
jest.mock('@/core/hooks/queries/user-user.query', () => ({
	useUserQuery: () => ({ data: { tenantId: 'tenant-1', employee: { organizationId: 'organization-1' } } })
}));
jest.mock('@/core/hooks/tasks/use-task-statuses-query', () => ({
	useTaskStatusesQuery: () => ({
		getTaskStatusesLoading: false,
		taskStatuses: mockStatuses,
		setTaskStatuses: jest.fn()
	})
}));
jest.mock('@/core/hooks/tasks/use-create-task-status', () => ({
	useCreateTaskStatus: () => ({ createTaskStatus: mockCreateTaskStatus, createTaskStatusLoading: false })
}));
jest.mock('@/core/hooks/tasks/use-edit-task-status', () => ({
	useEditTaskStatus: () => ({ editTaskStatus: mockEditTaskStatus, editTaskStatusLoading: false })
}));
jest.mock('@/core/hooks/tasks/use-delete-task-status', () => ({
	useDeleteTaskStatus: () => ({ deleteTaskStatus: jest.fn() })
}));
jest.mock('@/core/hooks/tasks/use-task-settings-access', () => ({
	useTaskSettingsAccess: () => ({
		canCreate: true,
		canWriteRow: () => true,
		canWriteRows: () => true,
		readOnlyHint: ''
	})
}));
jest.mock('@/core/stores', () => {
	const { atom } = jest.requireActual('jotai');
	return { tasksByTeamState: atom([]) };
});
jest.mock('@/core/components', () => ({
	Button: ({
		children,
		type = 'button',
		disabled,
		onClick
	}: {
		children?: ReactNode;
		type?: 'button' | 'submit';
		disabled?: boolean;
		onClick?: () => void;
	}) => (
		<button type={type} disabled={disabled} onClick={onClick}>
			{children}
		</button>
	),
	ColorPicker: () => null,
	Modal: () => null,
	Text: ({ children }: { children?: ReactNode }) => <p>{children}</p>
}));
jest.mock('@/core/components/settings/list-card', () => ({ StatusesListCard: () => null }));
jest.mock('@/core/components/pages/kanban/sort-tasks-status-settings', () => ({
	__esModule: true,
	default: () => null
}));
jest.mock('@/core/components/features/tasks/delete-status-confirmation-modal', () => ({
	DeleteTaskStatusConfirmationModal: () => null
}));
jest.mock('@/core/components/duplicated-components/tooltip', () => ({
	Tooltip: ({ children }: { children?: ReactNode }) => children
}));
jest.mock('@/core/components/duplicated-components/_input', () => {
	const { forwardRef } = jest.requireActual('react');
	// The props `register('name')` and the form pass: a plain input the form can read
	return {
		InputField: forwardRef(
			(
				{ type, placeholder, name, onChange, onBlur }: InputHTMLAttributes<HTMLInputElement>,
				ref: Ref<HTMLInputElement>
			) => (
				<input
					ref={ref}
					type={type}
					placeholder={placeholder}
					name={name}
					onChange={onChange}
					onBlur={onBlur}
				/>
			)
		)
	};
});
jest.mock('@/core/components/tasks/task-status', () => ({
	StandardTaskStatusDropDown: ({ onValueChange }: { onValueChange: (status: string) => void }) => (
		<button type="button" onClick={() => onValueChange('in-progress')}>
			status type in progress
		</button>
	)
}));
// The picker as the form drives it: what it shows, and a pick
jest.mock('@/core/components/settings/pages/task-properties/property-icon-picker', () => ({
	PropertyIconPicker: ({ value, onChange }: { value: string | null; onChange: (icon: string) => void }) => (
		<div>
			<output aria-label="shown icon">{value ?? ''}</output>
			<button type="button" onClick={() => onChange('hugeicons:rocket')}>
				pick rocket
			</button>
		</div>
	)
}));

const shownIcon = () => screen.getByLabelText('shown icon').textContent;
const typeName = (name: string) =>
	fireEvent.change(screen.getByPlaceholderText('pages.settingsTeam.CREATE_NEW_STATUS'), { target: { value: name } });
const create = () =>
	act(async () => {
		fireEvent.click(screen.getByRole('button', { name: 'common.CREATE' }));
	});

describe('TaskStatusesForm icon field', () => {
	beforeEach(() => {
		mockCreateTaskStatus.mockReset().mockResolvedValue({});
	});

	it('keeps an icon picked after the status type through a later render, and sends it', async () => {
		const { rerender } = render(<TaskStatusesForm formOnly onCreated={jest.fn()} />);
		typeName('QA');

		fireEvent.click(screen.getByRole('button', { name: 'status type in progress' }));
		expect(shownIcon()).toBe('ever-icons/task-statuses/in-progress.svg');

		fireEvent.click(screen.getByRole('button', { name: 'pick rocket' }));
		expect(shownIcon()).toBe('hugeicons:rocket');

		// Any later render of the form, such as a refetch of the statuses
		rerender(<TaskStatusesForm formOnly onCreated={jest.fn()} />);
		expect(shownIcon()).toBe('hugeicons:rocket');

		await create();

		await waitFor(() => expect(mockCreateTaskStatus).toHaveBeenCalledTimes(1));
		expect(mockCreateTaskStatus.mock.calls[0][0]).toMatchObject({ name: 'QA', icon: 'hugeicons:rocket' });
	});

	it('shows no icon once a create reset the form, which stays open for the next status', async () => {
		render(<TaskStatusesForm formOnly onCreated={jest.fn()} />);
		typeName('QA');
		fireEvent.click(screen.getByRole('button', { name: 'pick rocket' }));

		await create();

		await waitFor(() => expect(mockCreateTaskStatus).toHaveBeenCalledTimes(1));
		expect(mockCreateTaskStatus.mock.calls[0][0]).toMatchObject({ icon: 'hugeicons:rocket' });
		await waitFor(() => expect(shownIcon()).toBe(''));
	});
});
