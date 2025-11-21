import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useOrganizationTeams } from './use-organization-teams';
import { organizationTeamEmployeeService } from '@/core/services/client/api/organizations/teams';
import { queryKeys } from '@/core/query/keys';
import { toast } from 'sonner';
import { TOrganizationTeamEmployee, TOrganizationTeamEmployeeUpdate } from '@/core/types/schemas';
import { getErrorMessage, logErrorInDev } from '@/core/lib/helpers/error-message';

export function useOrganizationEmployeeTeams() {
	const { loadTeamsData } = useOrganizationTeams();
	const queryClient = useQueryClient();

	// React Query mutation for delete organization employee team
	const deleteOrganizationEmployeeTeamMutation = useMutation({
		mutationFn: ({ id, employeeId }: { id: string; employeeId: string }) =>
			organizationTeamEmployeeService.deleteOrganizationTeamEmployee({
				organizationTeamEmployeeId: id,
				employeeId
			}),
		mutationKey: queryKeys.organizationTeams.mutations.employee.delete(undefined),
		onSuccess: async () => {
			// Invalidate organization teams queries to refresh data
			await queryClient.invalidateQueries({
				queryKey: queryKeys.organizationTeams.all
			});

			// Preserve original behavior - call loadTeamsData
			await loadTeamsData();

			toast.success('Employee removed from team successfully');
		},
		onError: (error) => {
			toast.error('Failed to remove employee from team:', { description: error.message });
		}
	});

	// React Query mutation for update organization employee team
	const updateOrganizationEmployeeTeamMutation = useMutation({
		mutationFn: ({ id, data }: { id: string; data: Partial<TOrganizationTeamEmployeeUpdate> }) => {
			if (!id) {
				throw new Error('Id is required');
			}
			return organizationTeamEmployeeService.updateOrganizationTeamEmployee({
				organizationTeamEmployeeId: id,
				data
			});
		},
		mutationKey: queryKeys.organizationTeams.mutations.employee.update(undefined),
		onSuccess: async () => {
			// Invalidate organization teams queries to refresh data
			await queryClient.invalidateQueries({
				queryKey: queryKeys.organizationTeams.all
			});

			// Preserve original behavior - call loadTeamsData
			await loadTeamsData();
		},
		onError: (error) => {
			toast.error('Failed to update employee:', { description: error.message });
		}
	});

	// React Query mutation for edit employee order
	const editEmployeeOrderMutation = useMutation({
		mutationFn: ({
			employeeId,
			data
		}: {
			employeeId: string;
			data: { order: number; organizationTeamId: string; organizationId: string };
		}) =>
			organizationTeamEmployeeService.editOrganizationTeamEmployeeOrder({
				organizationTeamEmployeeId: employeeId,
				data
			}),
		mutationKey: queryKeys.organizationTeams.mutations.employee.updateOrder(undefined),
		onSuccess: async () => {
			// Invalidate organization teams queries to refresh data
			await queryClient.invalidateQueries({
				queryKey: queryKeys.organizationTeams.all
			});

			// Preserve original behavior - call loadTeamsData
			await loadTeamsData();
		},
		onError: (error) => {
			toast.error('Failed to update employee order:', { description: error.message });
		}
	});

	// React Query mutation for update employee active task
	const updateActiveTaskMutation = useMutation({
		mutationFn: ({ id, data }: { id: string; data: Partial<TOrganizationTeamEmployeeUpdate> }) =>
			organizationTeamEmployeeService.updateOrganizationTeamEmployeeActiveTask({
				organizationTeamEmployeeId: id,
				data
			}),
		mutationKey: queryKeys.organizationTeams.mutations.employee.updateActiveTask(undefined),
		onMutate: async ({ id, data }) => {
			// Cancel any outgoing refetches to prevent them from overwriting our optimistic update
			await queryClient.cancelQueries({ queryKey: queryKeys.organizationTeams.all });

			// Snapshot the previous value for rollback
			const previousTeams = queryClient.getQueryData(queryKeys.organizationTeams.all);

			// Optimistically update the cache
			queryClient.setQueriesData({ queryKey: queryKeys.organizationTeams.all }, (old: any) => {
				if (!old?.data?.items) return old;

				return {
					...old,
					data: {
						...old.data,
						items: old.data.items.map((team: any) => {
							if (!team.members) return team;

							return {
								...team,
								members: team.members.map((member: any) => {
									if (member.id === id) {
										return {
											...member,
											activeTaskId: data.activeTaskId ?? member.activeTaskId
										};
									}
									return member;
								})
							};
						})
					}
				};
			});

			// Return context with snapshot for potential rollback
			return { previousTeams };
		},
		onSuccess: async () => {
			// Invalidate with refetchType: 'none' to avoid immediate refetch
			// The optimistic update already updated the cache
			await queryClient.invalidateQueries({
				queryKey: queryKeys.organizationTeams.all,
				refetchType: 'none'
			});
		},
		onError: (error, _variables, context) => {
			// Rollback to previous state on error
			if (context?.previousTeams) {
				queryClient.setQueryData(queryKeys.organizationTeams.all, context.previousTeams);
			}

			toast.error('Failed to update employee active task:', {
				description: getErrorMessage(error, 'Unable to update active task')
			});
			logErrorInDev('Failed to update employee active task:', error);
		}
	});

	// Delete organization team employee function
	const deleteOrganizationTeamEmployee = useCallback(
		async ({ id, employeeId }: { id: string; employeeId: string }) => {
			return await deleteOrganizationEmployeeTeamMutation.mutateAsync({
				id,
				employeeId
			});
		},
		[deleteOrganizationEmployeeTeamMutation]
	);

	// Update organization team employee function
	const updateOrganizationTeamEmployee = useCallback(
		async (id: string, data: Partial<TOrganizationTeamEmployeeUpdate>) => {
			return await updateOrganizationEmployeeTeamMutation.mutateAsync({ id, data });
		},
		[updateOrganizationEmployeeTeamMutation]
	);

	// Update employee order function
	const updateOrganizationTeamEmployeeOrderOnList = useCallback(
		async (employee: TOrganizationTeamEmployee, order: number) => {
			return await editEmployeeOrderMutation.mutateAsync({
				employeeId: employee.id,
				data: {
					order,
					organizationTeamId: employee.organizationTeamId ?? '',
					organizationId: employee.organizationId ?? ''
				}
			});
		},
		[editEmployeeOrderMutation]
	);

	// Update employee active task function
	const updateOrganizationTeamEmployeeActiveTask = useCallback(
		async (id: string, data: Partial<TOrganizationTeamEmployeeUpdate>) => {
			return await updateActiveTaskMutation.mutateAsync({ id, data });
		},
		[updateActiveTaskMutation]
	);

	return {
		deleteOrganizationEmployeeTeamLoading: deleteOrganizationEmployeeTeamMutation.isPending,
		deleteOrganizationTeamEmployee,
		updateOrganizationEmployeeTeamLoading: updateOrganizationEmployeeTeamMutation.isPending,
		updateOrganizationTeamEmployee,
		updateOrganizationTeamEmployeeActiveTaskLoading: updateActiveTaskMutation.isPending,
		updateOrganizationTeamEmployeeActiveTask,
		editEmployeeIndexOrganizationTeamLoading: editEmployeeOrderMutation.isPending,
		updateOrganizationTeamEmployeeOrderOnList
	};
}
