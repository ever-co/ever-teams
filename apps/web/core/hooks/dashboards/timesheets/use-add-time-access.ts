'use client';

import { useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { useMyRolePermissionsQuery } from '@/core/hooks/roles/use-my-role-permissions-query';
import { addTimeScopeOf, type FixedMember } from '@/core/lib/utils/dashboards/manual-time-entry';
import { currentOrganizationState } from '@/core/stores/user/user-organizations';
import type { TUser } from '@/core/types/schemas';
import { viewerOf } from './use-sheet-empty-members';
import type { TimesheetPermissions } from './use-timesheets-page';

const MANUAL_TIME_PERMISSION = 'ALLOW_MANUAL_TIME';

/**
 * Who the Add time action of Timesheets is for. `fixedMember` is set when the viewer adds their own time only: the
 * dialog then records time for them and offers no other member.
 */
export function useAddTimeAccess(permissions: TimesheetPermissions, user: TUser | null | undefined) {
	const organization = useAtomValue(currentOrganizationState);
	const { myPermissions } = useMyRolePermissionsQuery();
	const { hasOrganizationRole, employeeId } = permissions;
	const hasManualTimePermission = myPermissions.includes(MANUAL_TIME_PERMISSION);
	const allowsManualTime = organization?.allowManualTime !== false;
	const scope = addTimeScopeOf({
		hasOrganizationRole,
		hasManualTimePermission,
		ownEmployeeId: employeeId,
		allowsManualTime
	});
	const viewerName = viewerOf(user)?.name ?? '';

	const fixedMember = useMemo<FixedMember | null>(() => {
		const addsOwnTimeOnly = scope === 'own';
		if (!addsOwnTimeOnly || !employeeId) {
			return null;
		}
		return { employeeId, name: viewerName };
	}, [employeeId, scope, viewerName]);

	const canAddTime = scope !== 'none';
	return { canAddTime, fixedMember };
}
