import { workingEmployeesEmailState, workingEmployeesState } from '@/core/stores/user/employee';
import { useCallback, useEffect, useMemo } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { employeeService } from '@/core/services/client/api/organizations/teams';
import { useFirstLoad } from '../../common';
import { queryKeys } from '@/core/query/keys';
import { TUpdateEmployee } from '@/core/types/schemas/organization/employee.schema';
import { toast } from 'sonner';
import { useUserQuery } from '../../queries/user-user.query';
import { activeTeamIdState } from '@/core/stores/teams/organization-team';
import { getAccessTokenCookie, getActiveTeamIdCookie } from '@/core/lib/helpers/cookies';
import { FAST_APP_BOOTSTRAP } from '@/core/constants/config/constants';
import { useFastScopeGuard } from '../../bootstrap/use-fast-scope-guard';

export interface UseEmployeeOptions {
	enabled?: boolean;
}

export const useEmployee = ({ enabled = true }: UseEmployeeOptions = {}) => {
	const { data: user } = useUserQuery();
	const [workingEmployees, setWorkingEmployees] = useAtom(workingEmployeesState);
	const [workingEmployeesEmail, setWorkingEmployeesEmail] = useAtom(workingEmployeesEmailState);

	const { firstLoadData: firstLoadDataEmployee } = useFirstLoad();

	// Get the active team ID from the currently selected team (not from user's default team)
	const activeTeamId = useAtomValue(activeTeamIdState);
	const organizationTeamId = activeTeamId ?? getActiveTeamIdCookie();
	const fastBootstrap = FAST_APP_BOOTSTRAP.value;

	// Memoize query parameters to prevent unnecessary re-renders
	const queryParams = useMemo(
		() => ({
			tenantId: user?.tenantId,
			organizationId: user?.employee?.organizationId,
			organizationTeamId // Include organizationTeamId for filtering
		}),
		[user?.tenantId, user?.employee?.organizationId, organizationTeamId]
	);
	const accessToken = fastBootstrap ? getAccessTokenCookie() : undefined;
	const scope = useMemo(
		() => ({
			tenantId: queryParams.tenantId,
			organizationId: queryParams.organizationId,
			teamId: queryParams.organizationTeamId,
			userId: user?.id,
			accessToken
		}),
		[accessToken, queryParams.organizationId, queryParams.organizationTeamId, queryParams.tenantId, user?.id]
	);
	const queryKey = fastBootstrap
		? queryKeys.users.employees.workingByScope(scope.tenantId, scope.organizationId, scope.teamId)
		: queryKeys.users.employees.working(
				queryParams.tenantId,
				queryParams.organizationId,
				queryParams.organizationTeamId
			);
	const fastOwnerActive = enabled && fastBootstrap;
	const fastQueryEnabled =
		fastOwnerActive &&
		!!(scope.tenantId && scope.organizationId && scope.teamId && scope.userId && scope.accessToken);
	const isCurrentScope = useFastScopeGuard(queryKey, fastOwnerActive);

	// React Query for fetching employees using /employee/members
	// NOTE: (migrated from /employee/pagination?.. because of security reasons)
	const { data: employeesData, isLoading: getWorkingEmployeeLoading } = useQuery({
		queryKey,
		queryFn: ({ signal }) =>
			fastBootstrap
				? employeeService.getWorkingEmployees(queryParams.organizationTeamId, { scope, signal })
				: employeeService.getWorkingEmployees(queryParams.organizationTeamId),
		enabled: fastBootstrap ? fastQueryEnabled : enabled && !!queryParams.tenantId && !!queryParams.organizationId
	});

	useEffect(() => {
		if (fastOwnerActive && isCurrentScope()) {
			setWorkingEmployees([]);
			setWorkingEmployeesEmail([]);
		}
	}, [
		fastOwnerActive,
		isCurrentScope,
		queryParams.organizationId,
		queryParams.organizationTeamId,
		queryParams.tenantId,
		setWorkingEmployees,
		setWorkingEmployeesEmail
	]);

	// Sync React Query data with Jotai state
	useEffect(() => {
		if (enabled && employeesData?.items && (!fastBootstrap || isCurrentScope())) {
			const items = employeesData.items;
			setWorkingEmployees(items);
			setWorkingEmployeesEmail(items.map((item) => item.user?.email ?? ''));
		}
	}, [employeesData, enabled, fastBootstrap, isCurrentScope, setWorkingEmployees, setWorkingEmployeesEmail]);

	// Legacy function to maintain backward compatibility
	const getWorkingEmployeeQueryCall = useCallback(() => {
		if (fastBootstrap) {
			if (!fastQueryEnabled) return Promise.resolve({ items: [], total: 0 });
			return employeeService.getWorkingEmployees(queryParams.organizationTeamId, { scope });
		}
		return employeeService.getWorkingEmployees(queryParams.organizationTeamId);
	}, [fastBootstrap, fastQueryEnabled, queryParams.organizationTeamId, scope]);

	return {
		firstLoadDataEmployee,
		getWorkingEmployeeQueryCall,
		getWorkingEmployeeLoading,
		workingEmployees,
		workingEmployeesEmail
	};
};

export const useEmployeeUpdate = () => {
	const queryClient = useQueryClient();

	// React Query mutation for updating employee
	const { mutate: updateEmployeeMutation, isPending: isLoading } = useMutation({
		mutationFn: ({ id, data }: { id: string; data: TUpdateEmployee }) =>
			employeeService.updateEmployee({ id, data }),
		onSuccess: (updatedEmployee, { id }) => {
			// Invalidate and refetch employee queries
			queryClient.invalidateQueries({
				queryKey: queryKeys.users.employees.all
			});

			// Optionally update specific employee in cache
			queryClient.setQueryData(queryKeys.users.employees.detail(id), updatedEmployee);
		},
		onError: (error) => {
			toast.error('Employee update failed:', { description: error.message });
		}
	});

	// Legacy function to maintain backward compatibility
	const updateEmployee = useCallback(
		({ id, data }: { id: string; data: TUpdateEmployee }) => {
			updateEmployeeMutation({ id, data });
		},
		[updateEmployeeMutation]
	);

	return { updateEmployee, isLoading };
};
