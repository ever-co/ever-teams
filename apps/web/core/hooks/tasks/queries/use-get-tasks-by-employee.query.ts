import { queryKeys } from '@/core/query/keys';
import { activeTeamState } from '@/core/stores';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { useMemo } from 'react';
import { TASK_QUERY_GC_TIME_HOUR } from '../constants/TASK_QUERY_GC_TIME';
import { taskService } from '@/core/services/client/api';
import { useLazyQueryState } from '../utils/use-lazy-query';

export const useGetTaskByEmployeeQuery = (employeeId: string) => {
	const activeTeam = useAtomValue(activeTeamState);
	const _teamId = useMemo(() => activeTeam?.id, [activeTeam?.id]);

	const query = useQuery({
		queryKey: queryKeys.tasks.byEmployee(employeeId, _teamId),
		queryFn: async () => {
			if (!_teamId) throw new Error('Team ID is Required');
			if (!employeeId) throw new Error('Employee ID is Required');

			return await taskService.getTasksByEmployeeId({ employeeId });
		},
		gcTime: TASK_QUERY_GC_TIME_HOUR
	});
	return query;
};

export const useGetTaskByEmployeeLazyQuery = () => {
	const activeTeam = useAtomValue(activeTeamState);

	const queryClient = useQueryClient();
	const { setQueryKey, ...state } = useLazyQueryState();

	const getTasksByEmployeeId = async (employeeId: string) => {
		const teamId = activeTeam?.id;

		return queryClient.fetchQuery({
			queryKey: queryKeys.tasks.byEmployee(employeeId, teamId),
			queryFn: async () => {
				setQueryKey(queryKeys.tasks.byEmployee(employeeId, teamId));
				if (!teamId) throw new Error('Team ID is Required');
				if (!employeeId) throw new Error('Employee ID is Required');

				return await taskService.getTasksByEmployeeId({ employeeId });
			},
			gcTime: TASK_QUERY_GC_TIME_HOUR
		});
	};

	return { getTasksByEmployeeId, ...state };
};
