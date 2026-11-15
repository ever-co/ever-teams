'use client';

import { useCallback } from 'react';
import { useAtomValue } from 'jotai';
import { useGetCurrentOrganization } from '@/core/hooks/auth/use-current-organization';
import { currentOrganizationState } from '@/core/stores/user/user-organizations';

/**
 * The organization billable amounts are priced with: its default billing rate, its currency and its rounding rule.
 * It is read only for a reader who gets amounts, once their permissions are known, so the app shell reads nothing
 * more on startup. Until it is read the amounts wait, and a failed read shows none: amounts priced without it would
 * look final while they are not.
 */
export function useBillingOrganization(isEnabled: boolean) {
	const organizationRead = useGetCurrentOrganization({ enabled: isEnabled });
	const organization = useAtomValue(currentOrganizationState);
	const isMissing = isEnabled && organization === null;
	const isError = isMissing && organizationRead.isError;
	const isPending = isMissing && !organizationRead.isError;
	const { refetch } = organizationRead;
	// A retry reads it again only once it failed: a read organization stays as it is
	const retry = useCallback(() => {
		if (isError) {
			void refetch();
		}
	}, [isError, refetch]);
	return { isPending, isError, retry };
}
