'use client';

import { useMemo } from 'react';
import { useMyRolePermissionsQuery } from '@/core/hooks/roles/use-my-role-permissions-query';
import { canViewClients } from '@/core/lib/utils/clients';

export function useClientViewAccess() {
	const { myPermissions, isLoaded } = useMyRolePermissionsQuery();
	const canView = useMemo(() => canViewClients(myPermissions), [myPermissions]);
	return { isKnown: isLoaded, canView };
}
