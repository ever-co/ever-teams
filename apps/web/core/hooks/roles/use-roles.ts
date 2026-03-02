import { useRolesQuery } from './use-roles-query';
import { useRolesMutations } from './use-roles-mutations';
import { useInvalidateRoles } from './use-invalidate-roles';

/**
 * @deprecated Use granular hooks instead:
 * - `useRolesQuery()` for reading roles
 * - `useRolesMutations()` for create/update/delete
 * - `useInvalidateRoles()` for cache invalidation
 */
export const useRoles = () => {
	const { roles, isLoading } = useRolesQuery();
	const { invalidateRoles } = useInvalidateRoles();
	const mutations = useRolesMutations();

	return {
		roles,
		loading: isLoading,
		getRoles: invalidateRoles,
		firstLoadRolesData: invalidateRoles,
		...mutations
	};
};
