import { useMemo } from 'react';
import { useGetCurrentTeamTasksQuery } from '../queries/use-get-tasks-by-team.query';
import moment from 'moment';

const defaultValue = { items: [], total: 0 };
export const useCurrentTeamTasks = () => {
	const { data: tasksResponse = defaultValue } = useGetCurrentTeamTasksQuery();

	return { ...tasksResponse };
};

type SortableTaskField = 'createdAt' | 'updatedAt' | 'dueDate';
type SortOrder = 'asc' | 'desc';

export const useSortedTasks = (field: SortableTaskField = 'createdAt', order: SortOrder = 'desc') => {
	const { items: tasks } = useCurrentTeamTasks();

	const sortedTasks = useMemo(() => {
		const multiplier = order === 'desc' ? 1 : -1;

		return [...(tasks ?? [])].sort((a, b) => {
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
