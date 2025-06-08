import { rolesState } from '@/core/stores';
import { useAtom } from 'jotai';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { roleService } from '@/core/services/client/api/roles';
import { queryKeys } from '@/core/query/keys';
import { useConditionalUpdateEffect } from '../common';
import { useCallback } from 'react';

export const useRoles = () => {
	const [roles, setRoles] = useAtom(rolesState);
	const queryClient = useQueryClient();

	const rolesQuery = useQuery({
		queryKey: queryKeys.roles.all,
		queryFn: roleService.getRoles
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
			if (rolesQuery.data) {
				setRoles(rolesQuery.data.items);
			}
		},
		[rolesQuery.data],
		Boolean(roles?.length)
	);
	return {
		roles,
		setRoles,
		loading: rolesQuery.isLoading,
		getRoles: invalidateRolesData,

		createRole: createRoleMutation.mutate,
		createRoleLoading: createRoleMutation.isPending,

		updateRole: updateRoleMutation.mutate,
		updateRoleLoading: updateRoleMutation.isPending,

		deleteRole: deleteRoleMutation.mutate,
		deleteRoleLoading: deleteRoleMutation.isPending,

		// For backward compatibility with existing code
		firstLoadRolesData: invalidateRolesData
	};
};
