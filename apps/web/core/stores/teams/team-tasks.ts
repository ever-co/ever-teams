import moment from 'moment';
import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import { TTask } from '@/core/types/schemas/task/task.schema';
import { TTaskStatistic } from '@/core/types/schemas/activities/statistics.schema';

/**
 * @deprecated Use `useCurrentTeamTasks()` hook instead.
 * This atom is no longer in sync with TanStack Query cache.
 *
 * Migration:
 * - Before: const tasks = useAtomValue(teamTasksState)
 * - After:  const tasks = useCurrentTeamTasks()
 *
 * @see useCurrentTeamTasks
 */
export const teamTasksState = atom<TTask[]>([]);

/**
 * @deprecated Use `useCurrentActiveTask()` hook instead.
 * This atom is no longer in sync with TanStack Query cache.
 *
 * Migration:
 * - Before: const task = useAtomValue(activeTeamTaskState)
 * - After:  const task = useCurrentActiveTask()
 *
 * @see useCurrentActiveTask
 */
export const activeTeamTaskState = atom<TTask | null>(null);

/**
 * Stores the ID of the currently active task for the team.
 *
 * @warning DO NOT UPDATE THIS ATOM DIRECTLY!
 * Always use the `useSetActiveTask()` hook to modify this value.
 *
 * The hook handles:
 * - Optimistic UI updates with rollback
 * - Server synchronization with retry logic
 * - Cookie persistence for multi-device support
 * - Proper state consistency across the app
 *
 * Direct updates will bypass these mechanisms and cause sync issues.
 *
 * @example
 * // ❌ WRONG - Never do this
 * const [taskId, setTaskId] = useAtom(activeTeamTaskId);
 * setTaskId({ id: 'some-id' });
 *
 * // ✅ CORRECT - Use the hook
 * const { setActiveTask } = useSetActiveTask();
 * await setActiveTask(task);
 */
export const activeTeamTaskId = atom<{ id: string | null }>({
	id: ''
});
export const tasksFetchingState = atom<boolean>(false);

/**
 * @deprecated Use `useDetailedTask()` hook instead.
 * This atom is no longer in sync with TanStack Query cache.
 *
 * The hook now handles:
 * - Data fetching via TanStack Query
 * - Cache management with automatic garbage collection
 * - Prefilling for hover optimization
 *
 * Migration:
 * - Before: const task = useAtomValue(detailedTaskState)
 * - After:  const { detailedTaskQuery } = useDetailedTask()
 *           const task = detailedTaskQuery.data
 *
 * @see useDetailedTask
 */
export const detailedTaskState = atom<TTask | null>(null);

/**
 * Stores the ID of the task currently displayed in the detail panel.
 *
 * @warning For read/write operations, prefer using `useDetailedTask()` hook
 * which provides additional features:
 * - Automatic data fetching via TanStack Query
 * - Cache prefilling for instant detail view
 * - Proper loading/error states
 *
 * Direct atom access is acceptable for:
 * - Simple ID checks (e.g., "is detail panel open?")
 *
 * @example
 * // ✅ Recommended - Full featured hook
 * const { detailedTaskId, setDetailedTaskId, detailedTaskQuery } = useDetailedTask();
 *
 * // ✅ Acceptable - Simple panel state check
 * const detailedTaskId = useAtomValue(detailedTaskIdState);
 * const isDetailPanelOpen = !!detailedTaskId;
 *
 * @see useDetailedTask
 */
export const detailedTaskIdState = atom<string | null>(null);

// export const employeeTasksState = atom<TTask[] | null>({
// 	key: 'employeeTasksState',
// 	default: null
// });

/**
 * @deprecated Use `useSortedTasksByCreation()` hook instead.
 * This atom is no longer in sync with TanStack Query cache.
 *
 * Migration:
 * - Before: const tasks = useAtomValue(tasksByTeamState)
 * - After:  const tasks = useSortedTasksByCreation()
 *
 * @see useSortedTasksByCreation
 */
export const tasksByTeamState = atom<TTask[]>((get) => {
	const tasks = get(teamTasksState);

	return tasks
		.filter(() => {
			return true;
		})
		.sort((a, b) => moment(b.createdAt).diff(a.createdAt));
});

export const tasksStatisticsState = atom<{
	all: TTaskStatistic[];
	today: TTaskStatistic[];
}>({
	all: [],
	today: []
});
export const favoriteTasksAtom = atom<TTask[]>([]);
export const favoriteTasksStorageAtom = atomWithStorage<TTask[]>('favoriteTasks', []);

export const activeTaskStatisticsState = atom<{
	total: TTaskStatistic | null;
	today: TTaskStatistic | null;
}>({
	total: null,
	today: null
});

export const allTaskStatisticsState = atom<TTaskStatistic[]>([]);
