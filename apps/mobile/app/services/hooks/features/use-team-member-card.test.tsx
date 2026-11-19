import { act, renderHook } from '@testing-library/react-native';
import { types } from 'mobx-state-tree';
import { useTeamMemberCard } from './use-team-member-card';

type Task = { id: string; title: string; members: { id: string; userId: string }[] };

// The task store's own shapes for what the card reads: frozen tasks in an array filled by assignment, frozen statistics
const TaskStore = types
	.model({
		teamTasks: types.array(types.frozen<Task>()),
		activeTaskId: types.optional(types.string, ''),
		activeTask: types.frozen<Task | null>(null),
		tasksStatisticsState: types.optional(types.frozen<{ all: { id: string; duration: number }[] }>(), { all: [] })
	})
	.actions((store) => ({
		setTeamTasks(tasks: Task[]) {
			store.teamTasks = tasks as typeof store.teamTasks;
		},
		setActiveTaskId(id: string) {
			store.activeTaskId = id;
		},
		setActiveTask(task: Task | null) {
			store.activeTask = task;
		},
		setTasksStatisticsState(stats: { all: { id: string; duration: number }[] }) {
			store.tasksStatisticsState = stats;
		}
	}));

const mockStores: { TaskStore?: ReturnType<typeof TaskStore.create>; teamStore: object } = { teamStore: {} };

jest.mock('../../../models', () => ({ useStores: () => mockStores }));
jest.mock('./use-team-tasks', () => {
	const teamTasks = { updateTask: jest.fn(), setActiveTeamTask: jest.fn(), deleteEmployeeFromTasks: jest.fn() };
	return { useTeamTasks: () => teamTasks };
});
jest.mock('./use-authentificate-user', () => {
	const authenticated = { user: { id: 'user-kofi' }, isTeamManager: false };
	return { __esModule: true, default: () => authenticated };
});
jest.mock('./use-is-member-manager', () => {
	const roles = { isTeamManager: false, isTeamCreator: false };
	return { useIsMemberManager: () => roles };
});
jest.mock('../use-organization', () => {
	const organization = { onUpdateOrganizationTeam: jest.fn() };
	return { useOrganizationTeam: () => organization };
});

const HAR_3: Task = {
	id: 'task-har-3',
	title: 'Repaint maintenance hatch',
	members: [{ id: 'employee-kofi', userId: 'user-kofi' }]
};

const INSPECT_BOLTS: Task = {
	id: 'task-har-1',
	title: 'Inspect north pier bolts',
	members: [{ id: 'employee-kofi', userId: 'user-kofi' }]
};

const KOFI = {
	employee: { id: 'employee-kofi', userId: 'user-kofi', user: { id: 'user-kofi' } }
} as unknown as Parameters<typeof useTeamMemberCard>[0];

// The team's record of Kofi names his active task, as the teams query returns it
const KOFI_ON_HAR_3 = { ...KOFI, activeTaskId: 'task-har-3' } as unknown as Parameters<typeof useTeamMemberCard>[0];

describe("the person's own team card", () => {
	it("shows their task once the team's tasks arrive after the card first drew", async () => {
		const store = TaskStore.create({ teamTasks: [], activeTaskId: 'task-har-3' });
		mockStores.TaskStore = store;
		const { result, rerender } = await renderHook(() => useTeamMemberCard(KOFI));
		expect(result.current.memberTask).toBeNull();

		await act(() => store.setTeamTasks([HAR_3]));
		await rerender({});

		expect(result.current.memberTask?.id).toBe('task-har-3');
	});

	it('leaves the active task to the team when the team names one, so a running timer is not stopped', async () => {
		const store = TaskStore.create({ teamTasks: [] });
		mockStores.TaskStore = store;
		const { rerender } = await renderHook(() => useTeamMemberCard(KOFI_ON_HAR_3));

		await act(() => store.setTeamTasks([INSPECT_BOLTS, HAR_3]));
		await rerender({});

		expect(store.activeTaskId).toBe('');
		expect(store.activeTask).toBeNull();
	});

	it('still picks a task of theirs when the team names none', async () => {
		const store = TaskStore.create({ teamTasks: [] });
		mockStores.TaskStore = store;
		const { rerender } = await renderHook(() => useTeamMemberCard(KOFI));

		await act(() => store.setTeamTasks([HAR_3]));
		await rerender({});

		expect(store.activeTaskId).toBe('task-har-3');
		expect(store.activeTask?.id).toBe('task-har-3');
	});

	it('counts the time worked on it once the statistics arrive after the tasks', async () => {
		const store = TaskStore.create({ teamTasks: [HAR_3], activeTaskId: 'task-har-3' });
		mockStores.TaskStore = store;
		const { result, rerender } = await renderHook(() => useTeamMemberCard(KOFI));
		expect(result.current.memberTask?.totalWorkedTime).toBe(0);

		await act(() => store.setTasksStatisticsState({ all: [{ id: 'task-har-3', duration: 3120 }] }));
		await rerender({});

		expect(result.current.memberTask?.totalWorkedTime).toBe(3120);
	});
});
