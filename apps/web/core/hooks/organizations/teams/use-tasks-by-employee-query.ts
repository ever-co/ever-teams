'use client';

import { taskService } from '@/core/services/client/api';
import { activeTeamState } from '@/core/stores';
import { useCallback, useState } from 'react';
import { useAtomValue } from 'jotai';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';

/**
 * Tasks of one employee in one team, shared by `useTaskQueries` and the deprecated `useTeamTasks`.
 *
 * @param initialEmployeeId - Employee queried before the first `getTasksByEmployeeId` call, if any
 * @param initialOrganizationTeamId - Team queried before the first `getTasksByEmployeeId` call, if any
 * @returns Object containing:
 * - `getTasksByEmployeeId` - Fetches the tasks of an employee in a team
 * - `getTasksByEmployeeIdLoading` - Loading state of the selected employee's tasks
 */
export function useTasksByEmployeeQuery(initialEmployeeId?: string, initialOrganizationTeamId?: string) {
	const queryClient = useQueryClient();
	const activeTeam = useAtomValue(activeTeamState);

	const [selectedEmployeeId, setSelectedEmployeeId] = useState(initialEmployeeId);
	const [selectedOrganizationTeamId, setSelectedOrganizationTeamId] = useState(initialOrganizationTeamId);

	const tasksByEmployeeQuery = useQuery({
		queryKey: queryKeys.tasks.byEmployee(selectedEmployeeId, selectedOrganizationTeamId),
		queryFn: async () => {
			if (!activeTeam?.id) {
				throw new Error('Required parameters missing');
			}
			return await taskService.getTasksByEmployeeId({
				employeeId: selectedEmployeeId!,
				organizationTeamId: selectedOrganizationTeamId!
			});
		},
		enabled: !!selectedEmployeeId && !!activeTeam?.id && !!selectedOrganizationTeamId,
		gcTime: 1000 * 60 * 60
	});

	const getTasksByEmployeeId = useCallback(
		async (employeeId: string, organizationTeamId: string) => {
			try {
				if (!employeeId || !organizationTeamId) {
					throw new Error('Required parameters missing : employeeId or organizationTeamId');
				}

				// Updates state for UI, but fetches with the arguments: the query closure only sees them next render
				setSelectedEmployeeId(employeeId);
				setSelectedOrganizationTeamId(organizationTeamId);

				return await queryClient.fetchQuery({
					queryKey: queryKeys.tasks.byEmployee(employeeId, organizationTeamId),
					queryFn: async () => {
						return await taskService.getTasksByEmployeeId({ employeeId, organizationTeamId });
					}
				});
			} catch (error) {
				console.error('Error fetching tasks by employee ID:', error);
				return [];
			}
		},
		[queryClient]
	);

	return {
		getTasksByEmployeeId,
		getTasksByEmployeeIdLoading: tasksByEmployeeQuery.isLoading
	};
}
