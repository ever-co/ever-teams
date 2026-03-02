import { useMemo } from 'react';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { ERoleName } from '@/core/types/generics/enums/role';
import { TOrganizationProject } from '@/core/types/schemas';

interface UseProjectPermissionsProps {
	members?: TOrganizationProject['members'];
}

/**
 * Hook to check user permissions for project actions (edit, archive, delete)
 *
 * Permissions logic:
 * - Admin/Super Admin (global role): Can edit/archive/delete ALL projects
 * - Project Manager (member with isManager=true): Can edit/archive/delete THIS project
 * - Regular member: Can only view
 */
export function useProjectPermissions({ members }: UseProjectPermissionsProps) {
	const { data: user } = useUserQuery();

	// Check if user has global admin role
	const isGlobalAdmin = useMemo(() => {
		const roleName = user?.role?.name as ERoleName | undefined;
		return roleName === ERoleName.ADMIN || roleName === ERoleName.SUPER_ADMIN;
	}, [user?.role?.name]);

	// Check if user is a manager of THIS project
	const isProjectManager = useMemo(() => {
		if (!user?.id || !members) return false;
		return members.some((member) => member?.employee?.user?.id === user.id && member.isManager);
	}, [user?.id, members]);

	// Final permissions
	const canEdit = isGlobalAdmin || isProjectManager;
	const canArchive = isGlobalAdmin || isProjectManager;
	const canDelete = isGlobalAdmin || isProjectManager;

	return {
		isGlobalAdmin,
		isProjectManager,
		canEdit,
		canArchive,
		canDelete,
		// Show actions menu if user has at least one permission
		hasAnyPermission: canEdit || canArchive || canDelete
	};
}

