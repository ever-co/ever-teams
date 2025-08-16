import { rolesState } from '@/core/stores';
import { useAtom } from 'jotai';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { roleService } from '@/core/services/client/api/roles';
import { queryKeys } from '@/core/query/keys';
import { useCallback } from 'react';
import { getTenantIdCookie } from '@/core/lib/helpers/cookies';
import { useConditionalUpdateEffect } from '../common';
import { ERoleName } from '@/core/types/generics/enums/role';
import { useUserQuery } from '../queries/user-user.query';

/**
 * Enhanced useRoles hook with proper authentication context and caching
 *
 * This hook provides comprehensive role management functionality including:
 * - Fetching available roles from the API with authentication context
 * - Managing role state with persistence
 * - Proper React Query configuration with caching strategy
 * - Automatic enablement based on tenant/organization availability
 *
 * @returns Object containing roles data, loading states, and mutation functions
 */
export const useRoles = () => {
	const [roles, setRoles] = useAtom(rolesState);
	const queryClient = useQueryClient();
	const { data: user } = useUserQuery();
	const isAdmin = user?.role?.name
		? [ERoleName.ADMIN, ERoleName.SUPER_ADMIN].includes(user.role.name as ERoleName)
		: false;

	// Get authentication context
	const tenantId = getTenantIdCookie();

	const rolesQuery = useQuery({
		queryKey: queryKeys.roles.all,
		queryFn: roleService.getRoles,
		enabled: !!tenantId && isAdmin,
		staleTime: 1000 * 60 * 10, // Roles are relatively stable, cache for 10 minutes
		gcTime: 1000 * 60 * 30 // Keep in cache for 30 minutes
	});

	const invalidateRolesData = useCallback(
		() => queryClient.invalidateQueries({ queryKey: queryKeys.roles.all }),
		[queryClient]
	);
	const createRoleMutation = useMutation({
		mutationFn: roleService.createRole,
		onSuccess: invalidateRolesData
	});

	const updateRoleMutation = useMutation({
		mutationFn: roleService.updateRole,
		onSuccess: invalidateRolesData
	});

	const deleteRoleMutation = useMutation({
		mutationFn: roleService.deleteRole,
		onSuccess: invalidateRolesData
	});

	useConditionalUpdateEffect(
		() => {
			if (rolesQuery.data?.items) {
				setRoles(rolesQuery.data.items);
			}
		},
		[rolesQuery.data?.items, setRoles],
		Boolean(roles?.length)
	);
	return {
		roles,
		setRoles,
		loading: rolesQuery.isLoading,
		error: rolesQuery.error, // Expose error for debugging
		isError: rolesQuery.isError,
		getRoles: invalidateRolesData,

		createRole: createRoleMutation.mutate,
		createRoleLoading: createRoleMutation.isPending,
		createRoleError: createRoleMutation.error,

		updateRole: updateRoleMutation.mutate,
		updateRoleLoading: updateRoleMutation.isPending,
		updateRoleError: updateRoleMutation.error,

		deleteRole: deleteRoleMutation.mutate,
		deleteRoleLoading: deleteRoleMutation.isPending,
		deleteRoleError: deleteRoleMutation.error,

		// For backward compatibility with existing code
		firstLoadRolesData: invalidateRolesData
	};
};
