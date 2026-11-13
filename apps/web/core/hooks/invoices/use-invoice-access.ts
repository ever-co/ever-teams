'use client';

import { useMemo } from 'react';
import { useMyRolePermissionsQuery } from '@/core/hooks/roles/use-my-role-permissions-query';
import { invoiceAccessOf } from '@/core/lib/utils/invoice-access';

/**
 * What the signed-in user may do with invoices. Nothing is offered until the permissions are read; a read that
 * settled without them is reported so the page can say so instead of waiting forever.
 */
export function useInvoiceAccess() {
	const { myPermissions, isLoaded, isLoading } = useMyRolePermissionsQuery();
	const access = useMemo(() => invoiceAccessOf(myPermissions), [myPermissions]);
	const hasFailed = !isLoaded && !isLoading;
	return { canView: access.canView, canCreate: access.canCreate, isLoaded, hasFailed };
}
