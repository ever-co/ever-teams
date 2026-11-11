/** @jest-environment jsdom */

import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockUpdateTask = jest.fn();
const mockGetTaskById = jest.fn();
const mockInvalidate = jest.fn();
let mockPermissions: string[] = ['ORG_TASK_EDIT'];
const mockAna = { employeeId: 'employee-ana', userId: 'user-ana', name: 'Ana Silva' };
const mockBo = { employeeId: 'employee-bo', userId: 'user-bo', name: 'Bo Chen' };
const mockChen = { employeeId: 'employee-chen', userId: 'user-chen', name: 'Chen Li' };

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string, values?: Record<string, unknown>) => {
		const shown = Object.values(values ?? {});
		return shown.length ? `${key}:${shown.map(String).join(',')}` : key;
	}
}));
jest.mock('sonner', () => ({ toast: Object.assign(jest.fn(), { error: jest.fn() }) }));
jest.mock('@/core/services/client/api/chat', () => ({
	chatService: { updateTask: (...args: unknown[]) => mockUpdateTask(...args) }
}));
jest.mock('@/core/services/client/api/tasks/task.service', () => ({
	taskService: { getTaskById: (taskId: string) => mockGetTaskById(taskId) }
}));
jest.mock('@/core/hooks/chat/use-chat-scope', () => ({
	useChatPeople: () => ({
		list: [mockAna, mockBo, mockChen],
		byEmployee: new Map([
			[mockAna.employeeId, mockAna],
			[mockBo.employeeId, mockBo],
			[mockChen.employeeId, mockChen]
		]),
		byUser: new Map()
	})
}));
jest.mock('@/core/hooks/organizations/teams/use-invalidate-team-tasks', () => ({
	useInvalidateTeamTasks: () => ({ invalidateTeamTasksData: (taskId?: string) => mockInvalidate(taskId) })
}));
jest.mock('@/core/hooks/roles/use-my-role-permissions-query', () => ({ useMyRolePermissionsQuery: () => ({ myPermissions: mockPermissions }) }));
jest.mock('@/core/hooks/tasks/use-task-status', () => ({
	useTaskStatusValue: () => ({
		open: { id: 'st-open', name: 'open', realName: 'open', value: 'open', bgColor: '#ddd' },
		'in-progress': { id: 'st-progress', name: 'in progress', realName: 'in progress', value: 'in-progress', bgColor: '#fd0' }
	})
}));
jest.mock('@/core/hooks/tasks/use-task-priorities-value', () => ({
	useTaskPrioritiesValue: () => ({
		high: { id: 'pr-high', name: 'high', realName: 'high', value: 'high' },
		low: { id: 'pr-low', name: 'low', realName: 'low', value: 'low' }
	})
}));
jest.mock('@/core/stores/teams/team-tasks', () => {
	const { atom } = jest.requireActual<typeof import('jotai')>('jotai');
	return {
		tasksByTeamState: atom([
			{
				id: 'task-1',
				title: 'Ship the page',
				status: 'open',
				taskStatusId: 'st-open',
				priority: 'high',
				taskPriorityId: 'pr-high',
				members: [{ id: 'employee-ana', fullName: 'Ana Silva', user: { name: 'Ana Silva', imageUrl: null } }]
			}
		])
	};
});
// The menu and the glyphs are tested on their own: a plain list of the options stands in for the popover.
jest.mock('@/core/components/tasks/task-property-menu', () => ({
	TaskPropertyMenu: ({
		options,
		onSelect,
		isSelected,
		triggerLabel,
		children
	}: {
		options: Array<{ key: string; value: unknown; label: string }>;
		onSelect: (value: unknown) => void;
		isSelected: (value: unknown) => boolean;
		triggerLabel: string;
		children: React.ReactNode;
	}) => (
		<div role="group" aria-label={triggerLabel}>
			<span data-testid="trigger">{children}</span>
			{options.map((option) => (
				<button key={option.key} type="button" aria-pressed={isSelected(option.value)} onClick={() => onSelect(option.value)}>
					{option.label}
				</button>
			))}
		</div>
	)
}));
jest.mock('@/core/components/tasks/task-property-icon', () => ({ TaskPropertyIcon: () => <span aria-hidden="true" /> }));
jest.mock('@/core/components/tasks/task-property-trigger', () => ({ taskPropertySearchKey: () => 'search' }));
jest.mock('@/core/components/teams/people-avatars', () => ({
	PersonAvatar: ({ person }: { person: { id: string; name: string } }) => <span data-person={person.id}>{person.name}</span>,
	personFromTaskMember: (member: { id: string; fullName?: string }) => ({ id: member.id, name: member.fullName ?? '', imageUrl: null })
}));

import { toast } from 'sonner';
import { realtimeBus } from '@/core/lib/realtime/bus';
import { ChatTaskCard, resetChatTaskCards } from './chat-task-card';

const mockToast = toast as unknown as { error: jest.Mock };

function renderCard(props: Partial<React.ComponentProps<typeof ChatTaskCard>> = {}) {
	const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	const onOpenTask = jest.fn();
	const view = render(
		<QueryClientProvider client={client}>
			<ChatTaskCard messageId="m1" taskId="task-1" canChange onOpenTask={onOpenTask} {...props} />
		</QueryClientProvider>
	);
	return { ...view, onOpenTask, client };
}

const fresh = (extra: Record<string, unknown> = {}) => ({
	id: 'task-1',
	title: 'Ship the page',
	status: 'open',
	taskStatusId: 'st-open',
	priority: 'high',
	taskPriorityId: 'pr-high',
	members: [{ id: 'employee-ana', fullName: 'Ana Silva', user: { name: 'Ana Silva', imageUrl: null } }],
	...extra
});

beforeEach(() => {
	mockPermissions = ['ORG_TASK_EDIT'];
	mockUpdateTask.mockReset();
	mockUpdateTask.mockResolvedValue({ task: { id: 'task-1' }, events: [] });
	mockGetTaskById.mockReset();
	mockGetTaskById.mockResolvedValue(fresh());
	mockInvalidate.mockReset();
	mockToast.error.mockReset();
	resetChatTaskCards();
});

describe('a task card', () => {
	it('shows the task with its status, priority and assignees, and opens it', () => {
		const { onOpenTask } = renderCard();
		expect(screen.getByRole('group', { name: 'teamChat.TASK_STATUS: open' })).toBeTruthy();
		expect(screen.getByRole('group', { name: 'teamChat.TASK_PRIORITY: high' })).toBeTruthy();
		expect(screen.getByRole('group', { name: 'teamChat.TASK_ASSIGNEES: Ana Silva' })).toBeTruthy();
		// The team's list copy is enough: nothing is read for the card.
		expect(mockGetTaskById).not.toHaveBeenCalled();
		fireEvent.click(screen.getByRole('button', { name: /Ship the page/ }));
		expect(onOpenTask).toHaveBeenCalledWith('task-1');
	});

	it('changes the status in place through the message, then has the task read again wherever it shows', async () => {
		renderCard();
		const status = screen.getByRole('group', { name: 'teamChat.TASK_STATUS: open' });
		await act(async () => {
			fireEvent.click(within(status).getByRole('button', { name: 'in progress' }));
		});
		expect(mockUpdateTask).toHaveBeenCalledWith('m1', 'task-1', { status: 'in-progress', taskStatusId: 'st-progress' });
		// Shown at once, until the team's list reads the task again.
		expect(screen.getByRole('group', { name: 'teamChat.TASK_STATUS: in progress' })).toBeTruthy();
		await waitFor(() => expect(mockInvalidate).toHaveBeenCalledWith('task-1'));
	});

	it('sends quick changes one after the other, each assignee pick with the whole list', async () => {
		let answer: (value: unknown) => void = () => undefined;
		mockUpdateTask.mockImplementationOnce(() => new Promise((resolve) => (answer = resolve)));
		renderCard();
		const assignees = () => within(screen.getByRole('group', { name: /^teamChat.TASK_ASSIGNEES/ }));
		await act(async () => {
			fireEvent.click(assignees().getByRole('button', { name: 'Bo Chen' }));
		});
		await act(async () => {
			fireEvent.click(assignees().getByRole('button', { name: 'Chen Li' }));
		});
		// The second waits for the first.
		expect(mockUpdateTask).toHaveBeenCalledTimes(1);
		expect(mockUpdateTask).toHaveBeenLastCalledWith('m1', 'task-1', { assigneeEmployeeIds: ['employee-ana', 'employee-bo'] });
		await act(async () => answer({ task: { id: 'task-1' }, events: [] }));
		await waitFor(() => expect(mockUpdateTask).toHaveBeenCalledTimes(2));
		expect(mockUpdateTask).toHaveBeenLastCalledWith('m1', 'task-1', { assigneeEmployeeIds: ['employee-ana', 'employee-bo', 'employee-chen'] });
		// Read again once, after the last one.
		await waitFor(() => expect(mockInvalidate).toHaveBeenCalledTimes(1));
	});

	it('clears the priority, and names all the assignees when one is added', async () => {
		renderCard();
		await act(async () => {
			fireEvent.click(within(screen.getByRole('group', { name: 'teamChat.TASK_PRIORITY: high' })).getByRole('button', { name: 'teamChat.TASK_NO_PRIORITY' }));
		});
		expect(mockUpdateTask).toHaveBeenLastCalledWith('m1', 'task-1', { priority: null, taskPriorityId: null });
		await act(async () => {
			fireEvent.click(within(screen.getByRole('group', { name: /^teamChat.TASK_ASSIGNEES/ })).getByRole('button', { name: 'Bo Chen' }));
		});
		await waitFor(() => expect(mockUpdateTask).toHaveBeenLastCalledWith('m1', 'task-1', { assigneeEmployeeIds: ['employee-ana', 'employee-bo'] }));
	});

	it('says what the platform answered when it refuses, and shows the task as it was', async () => {
		mockUpdateTask.mockRejectedValue(Object.assign(new Error('Changing a task needs ORG_TASK_EDIT.'), { statusCode: 403 }));
		renderCard();
		await act(async () => {
			fireEvent.click(within(screen.getByRole('group', { name: 'teamChat.TASK_STATUS: open' })).getByRole('button', { name: 'in progress' }));
		});
		expect(mockToast.error).toHaveBeenCalledWith('Changing a task needs ORG_TASK_EDIT.');
		expect(screen.getByRole('group', { name: 'teamChat.TASK_STATUS: open' })).toBeTruthy();
	});

	it('stays read-only for a reader who may not edit tasks, and for a message not sent yet', () => {
		mockPermissions = [];
		const { unmount } = renderCard();
		expect(screen.queryByRole('group')).toBeNull();
		expect(screen.getByTitle('teamChat.TASK_STATUS').textContent).toBe('open');
		unmount();
		mockPermissions = ['ALL_ORG_EDIT'];
		renderCard({ canChange: false });
		expect(screen.queryByRole('group')).toBeNull();
		expect(screen.getByTitle('teamChat.TASK_PRIORITY').textContent).toBe('high');
	});

	it('turns every card of the page read-only when the platform has no task card route', async () => {
		mockUpdateTask.mockRejectedValue(Object.assign(new Error('Cannot PATCH /api/chat/messages/m1/tasks/task-1'), { statusCode: 404 }));
		const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
		render(
			<QueryClientProvider client={client}>
				<ChatTaskCard messageId="m1" taskId="task-1" canChange onOpenTask={jest.fn()} />
				<ChatTaskCard messageId="m2" taskId="task-1" canChange onOpenTask={jest.fn()} />
			</QueryClientProvider>
		);
		expect(screen.getAllByRole('group', { name: 'teamChat.TASK_STATUS: open' })).toHaveLength(2);
		await act(async () => {
			fireEvent.click(within(screen.getAllByRole('group', { name: 'teamChat.TASK_STATUS: open' })[0]).getByRole('button', { name: 'in progress' }));
		});
		await waitFor(() => expect(mockToast.error).toHaveBeenCalledWith('teamChat.TASK_UPDATE_FAILED'));
		expect(screen.queryByRole('group')).toBeNull();
	});

	it('keeps the status and priority of a task of another team read-only, its assignees still offered', async () => {
		mockGetTaskById.mockResolvedValue(fresh({ id: 'task-9', title: 'Elsewhere' }));
		renderCard({ taskId: 'task-9' });
		await waitFor(() => expect(screen.getByText('Elsewhere')).toBeTruthy());
		expect(screen.queryByRole('group', { name: /^teamChat.TASK_STATUS/ })).toBeNull();
		expect(screen.getByTitle('teamChat.TASK_STATUS').textContent).toBe('open');
		expect(screen.getByRole('group', { name: /^teamChat.TASK_ASSIGNEES/ })).toBeTruthy();
	});

	it('reads a task it read itself again when the platform says a message showing it changed', async () => {
		mockGetTaskById.mockResolvedValue(fresh({ id: 'task-9' }));
		renderCard({ taskId: 'task-9' });
		await waitFor(() => expect(mockGetTaskById).toHaveBeenCalledTimes(1));
		mockGetTaskById.mockClear();
		await act(async () => {
			realtimeBus.emit({
				eventId: 'e1',
				eventName: 'chat_message.updated',
				occurredAt: new Date().toISOString(),
				aggregate: { type: 'chat_message', id: 'm1' },
				sequence: 1,
				data: { conversationId: 'c1', messageId: 'm1' }
			});
		});
		await waitFor(() => expect(mockGetTaskById).toHaveBeenCalledWith('task-9'));
		mockGetTaskById.mockClear();
		await act(async () => {
			realtimeBus.emit({
				eventId: 'e2',
				eventName: 'chat_message.updated',
				occurredAt: new Date().toISOString(),
				aggregate: { type: 'chat_message', id: 'm2' },
				sequence: 2,
				data: { conversationId: 'c1', messageId: 'm2' }
			});
		});
		expect(mockGetTaskById).not.toHaveBeenCalled();
	});
});
