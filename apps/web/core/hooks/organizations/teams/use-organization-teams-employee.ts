import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useOrganizationTeams } from './use-organization-teams';
import { userState } from '@/core/stores';
import { useAtom } from 'jotai';
import { organizationTeamEmployeeService } from '@/core/services/client/api/organizations/teams';
import { queryKeys } from '@/core/query/keys';
import { toast } from 'sonner';
import { TOrganizationTeamEmployee, TOrganizationTeamEmployeeUpdate } from '@/core/types/schemas';

export function useOrganizationEmployeeTeams() {
	const { loadTeamsData } = useOrganizationTeams();
	const [user] = useAtom(userState);
	const queryClient = useQueryClient();

	// React Query mutation for delete organization employee team
	const deleteOrganizationEmployeeTeamMutation = useMutation({
		mutationFn: ({
			id,
			employeeId,
			organizationId,
			tenantId
		}: {
			id: string;
			employeeId: string;
			organizationId: string;
			tenantId: string;
		}) =>
			organizationTeamEmployeeService.deleteOrganizationEmployeeTeam({
				id,
				employeeId,
				organizationId,
				tenantId
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
		mutationFn: ({ id, data }: { id: string; data: Partial<TOrganizationTeamEmployeeUpdate> }) =>
			organizationTeamEmployeeService.updateOrganizationEmployeeTeam(id, data),
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
			data,
			tenantId
		}: {
			employeeId: string;
			data: { order: number; organizationTeamId: string; organizationId: string };
			tenantId?: string;
		}) => organizationTeamEmployeeService.editEmployeeOrderOrganizationTeam(employeeId, data, tenantId),
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
			organizationTeamEmployeeService.updateOrganizationTeamEmployeeActiveTask(id, data),
		mutationKey: queryKeys.organizationTeams.mutations.employee.updateActiveTask(undefined),
		onSuccess: async () => {
			// Invalidate organization teams queries to refresh data
			await queryClient.invalidateQueries({
				queryKey: queryKeys.organizationTeams.all
			});

			// Preserve original behavior - call loadTeamsData
			await loadTeamsData();
		},
		onError: (error) => {
			toast.error('Failed to update employee active task:', { description: error.message });
		}
	});

	// Delete organization team employee function
	const deleteOrganizationTeamEmployee = useCallback(
		async ({
			id,
			employeeId,
			organizationId,
			tenantId
		}: {
			id: string;
			employeeId: string;
			organizationId: string;
			tenantId: string;
		}) => {
			return await deleteOrganizationEmployeeTeamMutation.mutateAsync({
				id,
				employeeId,
				organizationId,
				tenantId
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
				},
				tenantId: user?.tenantId || ''
			});
		},
		[editEmployeeOrderMutation, user?.tenantId]
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
