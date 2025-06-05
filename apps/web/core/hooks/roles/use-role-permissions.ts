import { rolePermissionsFormatedState, rolePermissionsState } from '@/core/stores';
import { useCallback } from 'react';
import { useAtom } from 'jotai';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import cloneDeep from 'lodash/cloneDeep';
import { rolePermissionService } from '@/core/services/client/api/roles/role-permission.service';
import { TRolePermission } from '@/core/types/schemas/role/role-permission-schema';
import { queryKeys } from '@/core/query/keys';
import { useConditionalUpdateEffect } from '../common';

export const useRolePermissions = (roleId?: string) => {
	const [rolePermissions, setRolePermissions] = useAtom(rolePermissionsState);
	const [rolePermissionsFormated, setRolePermissionsFormated] = useAtom(rolePermissionsFormatedState);
	const queryClient = useQueryClient();

	// Query for fetching role permissions
	const rolePermissionsQuery = useQuery({
		queryKey: queryKeys.roles.permissions(roleId!),
		queryFn: () => {
			if (!roleId) return null;
			return rolePermissionService.getRolePermission(roleId);
		}
	});

	// Mutation for updating role permissions
	const updateRolePermissionMutation = useMutation({
		mutationFn: rolePermissionService.updateRolePermission,
		onSuccess: (_, permission) => {
			const index = rolePermissions.findIndex((item) => item.id === permission.id);
			const tempRoles = cloneDeep(rolePermissions);
			const formatedItems = cloneDeep(rolePermissionsFormated);

			if (index >= 0) {
				tempRoles[index] = permission;
				formatedItems[permission.permission] = permission;
			}

			setRolePermissionsFormated(formatedItems);
			setRolePermissions(tempRoles);

			// Invalidate the query to refetch fresh data
			if (roleId) {
				queryClient.invalidateQueries({ queryKey: queryKeys.roles.permissions(roleId) });
			}
		}
	});

	useConditionalUpdateEffect(
		() => {
			if (rolePermissionsQuery.data?.items?.length) {
				const tempRolePermissions = rolePermissionsQuery.data.items;
				const formatedItems: { [key: string]: TRolePermission } = {};

				tempRolePermissions.forEach((item: TRolePermission) => {
					formatedItems[item.permission] = item;
				});
				setRolePermissionsFormated(formatedItems);
				setRolePermissions(tempRolePermissions);
			}
		},
		[rolePermissionsQuery.data],
		Boolean(rolePermissions) || !rolePermissionsQuery.isFetching
	);

	// For backward compatibility
	const getRolePermissions = useCallback(
		(id: string) => {
			queryClient.invalidateQueries({ queryKey: queryKeys.roles.permissions(id) });
		},
		[queryClient]
	);

	return {
		loading: rolePermissionsQuery.isLoading,
		rolePermissions,
		getRolePermissions,
		updateRolePermission: updateRolePermissionMutation.mutate,
		updateRolePermissionLoading: updateRolePermissionMutation.isPending,
		rolePermissionsFormated
	};
};
