import { queryKeys } from '@/core/query/keys';
import { taskService } from '@/core/services/client/api';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCurrentTeam } from './use-current-team';
import { useMemo, useState } from 'react';

/**
 * Query hook to fetch tasks assigned to a specific employee.
 * Automatically refetches when employeeId or activeTeam changes.
 *
 * @param employeeId - The employee's unique identifier
 * @returns TanStack query object with employee's tasks data
 */
export const useGetTasksByEmployeeIdQuery = (employeeId: string) => {
	const activeTeam = useCurrentTeam();

	const query = useQuery({
		queryKey: queryKeys.tasks.byEmployee(employeeId, activeTeam?.id),
		queryFn: async () => {
			if (!activeTeam?.id) throw new Error('Required parameters missing');

			return await taskService.getTasksByEmployeeId({ employeeId });
		},
		gcTime: 1000 * 60 * 60
	});

	return query;
};

/**
 * Lazy query hook for on-demand employee tasks fetching.
 * Returns a callable function instead of auto-fetching.
 *
 * @returns Function that fetches tasks when invoked with employeeId
 */
export const useGetTasksByEmployeeIdQueryLazy = () => {
	const queryClient = useQueryClient();
	const activeTeam = useCurrentTeam();

	const [queryKey, setQueryKey] = useState<ReturnType<typeof queryKeys.tasks.byEmployee> | null>(null);
	const state = queryClient.getQueryState(queryKey ?? ['_none']);

	const status = useMemo(
		() => ({
			isError: state?.status == 'error',
			isPending: state?.status == 'pending',
			isSuccess: state?.status == 'success',
			isLoading: state?.status == 'pending' && state?.fetchStatus == 'fetching'
		}),
		[state?.status, state?.fetchStatus]
	);

	const getTasksByEmployeeIdQuery = (employeeId: string) => {
		return queryClient.fetchQuery({
			queryKey: queryKeys.tasks.byEmployee(employeeId, activeTeam?.id),
			queryFn: async ({ queryKey }) => {
				setQueryKey(queryKey);
				if (!activeTeam?.id) throw new Error('Required parameters missing');

				return await taskService.getTasksByEmployeeId({ employeeId });
			},
			gcTime: 1000 * 60 * 60
		});
	};

	return { getTasksByEmployeeIdQuery, ...state, ...status };
};
