import { rolesState } from '@/core/stores';
import { useAtom } from 'jotai';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { roleService } from '@/core/services/client/api/roles';

export const useRoles = () => {
	const [, setRoles] = useAtom(rolesState);
	const queryClient = useQueryClient();

	const rolesQuery = useQuery({
		queryKey: ['roles'],
		queryFn: () =>
			roleService.getRoles().then((response) => {
				setRoles(response.items);

				return response;
			})
	});

	const createRoleMutation = useMutation({
		mutationFn: roleService.createRole,
		onSuccess: (role) => {
			queryClient.invalidateQueries({ queryKey: ['roles'] });
		}
	});

	const updateRoleMutation = useMutation({
		mutationFn: roleService.updateRole,
		onSuccess: (role) => {
			queryClient.invalidateQueries({ queryKey: ['roles'] });
		}
	});

	const deleteRoleMutation = useMutation({
		mutationFn: roleService.deleteRole,
		onSuccess: (_, id) => {
			queryClient.invalidateQueries({ queryKey: ['roles'] });
		}
	});

	return {
		roles: rolesQuery.data?.items || [],
		setRoles,
		loading: rolesQuery.isLoading,
		getRoles: () => queryClient.invalidateQueries({ queryKey: ['roles'] }),

		createRole: createRoleMutation.mutate,
		createRoleLoading: createRoleMutation.isPending,

		updateRole: updateRoleMutation.mutate,
		updateRoleLoading: updateRoleMutation.isPending,

		deleteRole: deleteRoleMutation.mutate,
		deleteRoleLoading: deleteRoleMutation.isPending,

		// For backward compatibility with existing code
		firstLoadRolesData: () => queryClient.invalidateQueries({ queryKey: ['roles'] })
	};
};
