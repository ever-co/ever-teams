import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useOrganizationTeamsQuery } from './use-organization-teams-query';
import { organizationTeamEmployeeService } from '@/core/services/client/api/organizations/teams';
import { queryKeys } from '@/core/query/keys';
import { toast } from 'sonner';
import { useTranslations, type DottedLanguageObjectStringPaths } from 'next-intl';
import { TOrganizationTeamEmployee, TOrganizationTeamEmployeeUpdate } from '@/core/types/schemas';
import { logErrorInDev } from '@/core/lib/helpers/error-message';
import { errorReasonKeyOf } from '@/core/lib/utils/error-feedback';

function useFailureToast() {
	const t = useTranslations();

	return useCallback(
		(titleKey: DottedLanguageObjectStringPaths, error: unknown) => {
			const reasonKey = errorReasonKeyOf(error) as DottedLanguageObjectStringPaths;
			toast.error(t(titleKey), { description: t(reasonKey) });
		},
		[t]
	);
}

export function useOrganizationEmployeeTeams() {
	const { loadTeamsData } = useOrganizationTeamsQuery();
	const queryClient = useQueryClient();
	const t = useTranslations();
	const showFailure = useFailureToast();

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

			toast.success(t('toasts.teams.LEFT_TEAM'));
		},
		onError: (error) => {
			showFailure('toasts.teams.LEAVE_FAILED', error);
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

			// The member is saved by now: a failed reload must not turn the save into a failure for the caller
			try {
				await loadTeamsData();
			} catch (error) {
				logErrorInDev('[Teams] Reload after a member update failed:', error);
				toast.error(t('toasts.teams.TEAMS_RELOAD_FAILED'), { description: t('toasts.teams.REFRESH_PAGE') });
			}
		},
		onError: (error) => {
			showFailure('toasts.teams.MEMBER_NOT_SAVED', error);
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
		onError: async (error) => {
			showFailure('toasts.teams.MEMBER_ORDER_NOT_SAVED', error);
			// Part of the drop may have been saved: read the order the API really holds before the list goes back
			await queryClient.invalidateQueries({ queryKey: queryKeys.organizationTeams.all });
		}
	});

	// Depend on the STABLE mutateAsync, never on the mutation result object (recreated on every state change).
	const deleteOrganizationEmployeeTeamMutateAsync = deleteOrganizationEmployeeTeamMutation.mutateAsync;
	const updateOrganizationEmployeeTeamMutateAsync = updateOrganizationEmployeeTeamMutation.mutateAsync;
	const editEmployeeOrderMutateAsync = editEmployeeOrderMutation.mutateAsync;

	// Delete organization team employee function
	const deleteOrganizationTeamEmployee = useCallback(
		async ({ id, employeeId }: { id: string; employeeId: string }) => {
			return await deleteOrganizationEmployeeTeamMutateAsync({
				id,
				employeeId
			});
		},
		[deleteOrganizationEmployeeTeamMutateAsync]
	);

	// Update organization team employee function
	const updateOrganizationTeamEmployee = useCallback(
		async (id: string, data: Partial<TOrganizationTeamEmployeeUpdate>) => {
			return await updateOrganizationEmployeeTeamMutateAsync({ id, data });
		},
		[updateOrganizationEmployeeTeamMutateAsync]
	);

	// Update employee order function
	const updateOrganizationTeamEmployeeOrderOnList = useCallback(
		async (employee: TOrganizationTeamEmployee, order: number) => {
			return await editEmployeeOrderMutateAsync({
				employeeId: employee.id,
				data: {
					order,
					organizationTeamId: employee.organizationTeamId ?? '',
					organizationId: employee.organizationId ?? ''
				}
			});
		},
		[editEmployeeOrderMutateAsync]
	);

	const { updateOrganizationTeamEmployeeActiveTask, updateOrganizationTeamEmployeeActiveTaskLoading } =
		useUpdateEmployeeActiveTask();

	return {
		deleteOrganizationEmployeeTeamLoading: deleteOrganizationEmployeeTeamMutation.isPending,
		deleteOrganizationTeamEmployee,
		updateOrganizationEmployeeTeamLoading: updateOrganizationEmployeeTeamMutation.isPending,
		updateOrganizationTeamEmployee,
		updateOrganizationTeamEmployeeActiveTaskLoading,
		updateOrganizationTeamEmployeeActiveTask,
		editEmployeeIndexOrganizationTeamLoading: editEmployeeOrderMutation.isPending,
		updateOrganizationTeamEmployeeOrderOnList
	};
}

/**
 * The active task update alone. Components rendered once per member or task use it: useOrganizationEmployeeTeams
 * also mounts a teams query observer, which re-renders them on every refresh of the teams.
 */
export function useUpdateEmployeeActiveTask() {
	const queryClient = useQueryClient();
	const showFailure = useFailureToast();

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
			queryClient.setQueryData(queryKeys.organizationTeams.all, (old: any) => {
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
			// Invalidate with refetchType: 'active' to trigger refetch and update dataUpdatedAt
			// This ensures Jotai atoms (activeTeamState) are synchronized via the useEffect
			// in use-organization-teams.ts that depends on organizationTeamsQuery.dataUpdatedAt
			// Without refetch, dataUpdatedAt doesn't change and Jotai state stays stale
			await queryClient.invalidateQueries({
				queryKey: queryKeys.organizationTeams.all,
				refetchType: 'active'
			});
		},
		onError: (error, _variables, context) => {
			// Rollback to previous state on error
			if (context?.previousTeams) {
				queryClient.setQueryData(queryKeys.organizationTeams.all, context.previousTeams);
			}

			showFailure('toasts.teams.ACTIVE_TASK_NOT_SAVED', error);
			logErrorInDev('Failed to update employee active task:', error);
		}
	});

	// Depend on the STABLE mutateAsync, never on the mutation result object (recreated on every state change).
	const updateActiveTaskMutateAsync = updateActiveTaskMutation.mutateAsync;

	const updateOrganizationTeamEmployeeActiveTask = useCallback(
		async (id: string, data: Partial<TOrganizationTeamEmployeeUpdate>) => {
			return await updateActiveTaskMutateAsync({ id, data });
		},
		[updateActiveTaskMutateAsync]
	);

	return {
		updateOrganizationTeamEmployeeActiveTask,
		updateOrganizationTeamEmployeeActiveTaskLoading: updateActiveTaskMutation.isPending
	};
}
