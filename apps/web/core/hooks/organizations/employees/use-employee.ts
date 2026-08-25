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
import { getActiveTeamIdCookie } from '@/core/lib/helpers/cookies';
import { useScopeGuard } from '../../bootstrap/use-scope-guard';
import { useReactiveAccessTokenCookie } from '../../auth/use-reactive-access-token-cookie';
import { CREDENTIAL_SCOPED_QUERY_META } from '@/core/query/credential-query';

export interface UseEmployeeOptions {
	enabled?: boolean;
}

export const useEmployee = ({ enabled = true }: UseEmployeeOptions = {}) => {
	const { data: user } = useUserQuery();
	const queryClient = useQueryClient();
	const [workingEmployees, setWorkingEmployees] = useAtom(workingEmployeesState);
	const [workingEmployeesEmail, setWorkingEmployeesEmail] = useAtom(workingEmployeesEmailState);

	const { firstLoadData: firstLoadDataEmployee } = useFirstLoad();

	// Get the active team ID from the currently selected team (not from user's default team)
	const activeTeamId = useAtomValue(activeTeamIdState);
	const organizationTeamId = activeTeamId ?? getActiveTeamIdCookie();

	// Memoize query parameters to prevent unnecessary re-renders
	const queryParams = useMemo(
		() => ({
			tenantId: user?.tenantId,
			organizationId: user?.employee?.organizationId,
			organizationTeamId // Include organizationTeamId for filtering
		}),
		[user?.tenantId, user?.employee?.organizationId, organizationTeamId]
	);
	const reactiveAccessToken = useReactiveAccessTokenCookie();
	const accessToken = reactiveAccessToken;
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
	const queryKey = useMemo(
		() => queryKeys.users.employees.workingByScope(scope.tenantId, scope.organizationId, scope.teamId),
		[scope.organizationId, scope.teamId, scope.tenantId]
	);
	const ownerActive = enabled;
	const queryEnabled =
		ownerActive && !!(scope.tenantId && scope.organizationId && scope.teamId && scope.userId && scope.accessToken);
	const isCurrentScope = useScopeGuard(queryKey, ownerActive);

	// React Query for fetching employees using /employee/members
	// NOTE: (migrated from /employee/pagination?.. because of security reasons)
	const { data: employeesData, isLoading: getWorkingEmployeeLoading } = useQuery({
		queryKey,
		meta: CREDENTIAL_SCOPED_QUERY_META,
		queryFn: ({ signal }) => employeeService.getWorkingEmployees(queryParams.organizationTeamId, { scope, signal }),
		enabled: queryEnabled
	});

	useEffect(() => {
		if (ownerActive && isCurrentScope()) {
			setWorkingEmployees([]);
			setWorkingEmployeesEmail([]);
		}
	}, [
		isCurrentScope,
		ownerActive,
		queryParams.organizationId,
		queryParams.organizationTeamId,
		queryParams.tenantId,
		setWorkingEmployees,
		setWorkingEmployeesEmail
	]);

	// Sync React Query data with Jotai state
	useEffect(() => {
		if (enabled && employeesData?.items && isCurrentScope()) {
			const items = employeesData.items;
			setWorkingEmployees(items);
			setWorkingEmployeesEmail(items.map((item) => item.user?.email ?? ''));
		}
	}, [employeesData, enabled, isCurrentScope, setWorkingEmployees, setWorkingEmployeesEmail]);

	const getWorkingEmployeeQueryCall = useCallback(() => {
		if (!queryEnabled) return Promise.resolve({ items: [], total: 0 });
		return queryClient.fetchQuery({
			queryKey,
			meta: CREDENTIAL_SCOPED_QUERY_META,
			queryFn: ({ signal }) =>
				employeeService.getWorkingEmployees(queryParams.organizationTeamId, { scope, signal }),
			staleTime: 0
		});
	}, [queryClient, queryEnabled, queryKey, queryParams.organizationTeamId, scope]);

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
