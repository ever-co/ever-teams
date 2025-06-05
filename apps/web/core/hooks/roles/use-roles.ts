import { rolesState } from '@/core/stores';
import { useAtom } from 'jotai';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { roleService } from '@/core/services/client/api/roles';
import { queryKeys } from '@/core/query/keys';
import { useConditionalUpdateEffect } from '../common';

export const useRoles = () => {
	const [roles, setRoles] = useAtom(rolesState);
	const queryClient = useQueryClient();

	const rolesQuery = useQuery({
		queryKey: queryKeys.roles.all,
		queryFn: () =>
			roleService.getRoles().then((response) => {
				return response;
			})
	});

	const createRoleMutation = useMutation({
		mutationFn: roleService.createRole,
		onSuccess: (role) => {
			queryClient.invalidateQueries({ queryKey: queryKeys.roles.all });
		}
	});

	const updateRoleMutation = useMutation({
		mutationFn: roleService.updateRole,
		onSuccess: (role) => {
			queryClient.invalidateQueries({ queryKey: queryKeys.roles.all });
		}
	});

	const deleteRoleMutation = useMutation({
		mutationFn: roleService.deleteRole,
		onSuccess: (_, id) => {
			queryClient.invalidateQueries({ queryKey: queryKeys.roles.all });
		}
	});

	useConditionalUpdateEffect(
		() => {
			if (rolesQuery.data) {
				setRoles(rolesQuery.data.items);
			}
		},
		[rolesQuery.data],
		Boolean(roles) || !rolesQuery.isFetching
	);

	return {
		roles,
		setRoles,
		loading: rolesQuery.isLoading,
		getRoles: () => queryClient.invalidateQueries({ queryKey: queryKeys.roles.all }),

		createRole: createRoleMutation.mutate,
		createRoleLoading: createRoleMutation.isPending,

		updateRole: updateRoleMutation.mutate,
		updateRoleLoading: updateRoleMutation.isPending,

		deleteRole: deleteRoleMutation.mutate,
		deleteRoleLoading: deleteRoleMutation.isPending,

		// For backward compatibility with existing code
		firstLoadRolesData: () => queryClient.invalidateQueries({ queryKey: queryKeys.roles.all })
	};
};
