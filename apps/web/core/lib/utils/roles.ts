import { ERoleName } from '@/core/types/generics/enums/role';

const ORGANIZATION_ADMIN_ROLES: ReadonlySet<string> = new Set([ERoleName.ADMIN, ERoleName.SUPER_ADMIN]);

/** The roles that run the whole organization: every team, report and member, whether or not they belong to a team. */
export function isTenantAdminRole(roleName: string | null | undefined) {
	if (!roleName) {
		return false;
	}
	return ORGANIZATION_ADMIN_ROLES.has(roleName);
}
