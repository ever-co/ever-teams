'use client';

import { useMutation } from '@tanstack/react-query';
import { roleService } from '@/core/services/client/api/roles';
import { useInvalidateRoles } from './use-invalidate-roles';

/**
 * Hook for role CRUD mutations (WRITE only).
 * Invalidates roles cache on success.
 *
 * @returns Object containing create, update, delete mutations and their loading states
 */
export function useRolesMutations() {
	const { invalidateRoles } = useInvalidateRoles();

	const createRoleMutation = useMutation({
		mutationFn: roleService.createRole,
		onSuccess: invalidateRoles
	});

	const updateRoleMutation = useMutation({
		mutationFn: roleService.updateRole,
		onSuccess: invalidateRoles
	});

	const deleteRoleMutation = useMutation({
		mutationFn: roleService.deleteRole,
		onSuccess: invalidateRoles
	});

	return {
		createRole: createRoleMutation.mutate,
		createRoleLoading: createRoleMutation.isPending,
		createRoleError: createRoleMutation.error,

		updateRole: updateRoleMutation.mutate,
		updateRoleLoading: updateRoleMutation.isPending,
		updateRoleError: updateRoleMutation.error,

		deleteRole: deleteRoleMutation.mutate,
		deleteRoleLoading: deleteRoleMutation.isPending,
		deleteRoleError: deleteRoleMutation.error
	};
}

