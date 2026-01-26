import moment from 'moment';
import { useCurrentTeamTasks } from './use-current-team-tasks';
import { useMemo } from 'react';

type SortableTaskField = 'createdAt' | 'updatedAt' | 'dueDate';
type SortOrder = 'asc' | 'desc';

/**
 * Hook that returns current team's tasks sorted by a specified date field.
 *
 * @param field - Date field to sort by (default: 'createdAt')
 * @param order - Sort order (default: 'desc' for newest first)
 * @returns Sorted array of tasks
 *
 * @example
 * const newestFirst = useSortedTasks('createdAt', 'desc');
 * const oldestFirst = useSortedTasks('createdAt', 'asc');
 * const byDueDate = useSortedTasks('dueDate', 'asc');
 */
export const useSortedTasks = (field: SortableTaskField = 'createdAt', order: SortOrder = 'desc') => {
	const { tasks } = useCurrentTeamTasks();

	const sortedTasks = useMemo(() => {
		const multiplier = order === 'desc' ? 1 : -1;

		return [...tasks].sort((a, b) => {
			const dateA = a[field];
			const dateB = b[field];

			// Handle null/undefined dates (push them to the end)
			if (!dateA && !dateB) return 0;
			if (!dateA) return 1;
			if (!dateB) return -1;

			return multiplier * moment(dateB).diff(moment(dateA));
		});
	}, [tasks, field, order]);

	return sortedTasks;
};

// Convenience alias for backward compatibility
export const useSortedTasksByCreation = () => useSortedTasks('createdAt', 'desc');
