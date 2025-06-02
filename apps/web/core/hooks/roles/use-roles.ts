import { rolesState } from '@/core/stores';
import { useAtom } from 'jotai';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { roleService } from '@/core/services/client/api/roles';

export const useRoles = () => {
	const [, setRoles] = useAtom(rolesState);
	const queryClient = useQueryClient();

	const rolesQuery = useQuery({
		queryKey: ['roles'],
		queryFn: roleService.getRoles
	});

	const createRoleMutation = useMutation({
		mutationFn: roleService.createRole,
		onSuccess: (role) => {
			setRoles((prevRoles) => [role, ...prevRoles]);
			queryClient.invalidateQueries({ queryKey: ['roles'] });
		}
	});

	const updateRoleMutation = useMutation({
		mutationFn: roleService.updateRole,
		onSuccess: (role) => {
			setRoles((prevRoles) => prevRoles.map((item) => (item.id === role.id ? role : item)));
			queryClient.invalidateQueries({ queryKey: ['roles'] });
		}
	});

	const deleteRoleMutation = useMutation({
		mutationFn: roleService.deleteRole,
		onSuccess: (_, id) => {
			setRoles((prevRoles) => prevRoles.filter((item) => item.id !== id));
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
