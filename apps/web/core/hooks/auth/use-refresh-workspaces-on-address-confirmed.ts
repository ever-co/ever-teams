'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';

/**
 * Gauzy lists the other workspaces of an address only once that address is confirmed. When the signed-in account's
 * address turns confirmed (in the profile, from the banner, or through the e-mail link in another tab), the workspace
 * list is read again instead of waiting for its cache to expire.
 */
export function useRefreshWorkspacesOnAddressConfirmed(isEmailVerified: boolean | undefined) {
	const queryClient = useQueryClient();
	const wasUnconfirmed = useRef(false);

	useEffect(() => {
		if (isEmailVerified === false) {
			wasUnconfirmed.current = true;
			return;
		}
		if (isEmailVerified !== true) {
			return;
		}
		if (!wasUnconfirmed.current) {
			return;
		}
		wasUnconfirmed.current = false;
		void queryClient.invalidateQueries({ queryKey: queryKeys.workspaces.all });
	}, [isEmailVerified, queryClient]);
}
