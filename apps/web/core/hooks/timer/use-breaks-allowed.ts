'use client';

import { useAtomValue } from 'jotai';
import { useGetCurrentOrganization } from '@/core/hooks/auth/use-current-organization';
import { breaksAllowedIn } from '@/core/lib/utils/timer/timer-break';
import { currentOrganizationState } from '@/core/stores/user/user-organizations';

/**
 * Whether the current organization turned breaks on (Gauzy #11940). Off until its organization is read, and off with
 * a Gauzy that has no such setting: no break control, type or list appears then. The organization is read here, as
 * some pages do not load it otherwise.
 *
 * @param enabled Whether the answer is needed now. The timer's break button shows only while the timer runs: it asks
 * then, so a page load with the timer stopped does not read the organization (startup-performance.cy.ts).
 */
export function useBreaksAllowed(enabled = true): boolean {
	useGetCurrentOrganization({ enabled });
	const organization = useAtomValue(currentOrganizationState);
	return breaksAllowedIn(organization);
}
