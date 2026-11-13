'use client';

import { useMemo } from 'react';
import { useMyRolePermissionsQuery } from '@/core/hooks/roles/use-my-role-permissions-query';
import { clientAccessOf } from '@/core/lib/utils/clients';

/**
 * What the signed-in user may do with clients, by the permissions the API checks on those writes. Nothing is offered
 * until the permissions are read.
 */
export function useClientAccess() {
	const { myPermissions } = useMyRolePermissionsQuery();
	return useMemo(() => clientAccessOf(myPermissions), [myPermissions]);
}
