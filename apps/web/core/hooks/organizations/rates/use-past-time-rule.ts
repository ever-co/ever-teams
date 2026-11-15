'use client';

import { useAtomValue } from 'jotai';
import { pastTimeRuleOf, type PastTimeRule } from '@/core/lib/utils/rate-apply';
import { currentOrganizationState } from '@/core/stores/user/user-organizations';

/**
 * Whether the current organization's time keeps the rate it was tracked at (#5212): what the pages that price time
 * say of their amounts. Null before the organization is read and on a Gauzy that does not store rates on time.
 */
export function usePastTimeRule(): PastTimeRule | null {
	const organization = useAtomValue(currentOrganizationState);
	return pastTimeRuleOf(organization);
}
