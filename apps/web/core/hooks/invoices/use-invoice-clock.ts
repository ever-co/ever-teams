'use client';

import { useAtomValue } from 'jotai';
import { todayDayKey } from '@/core/lib/utils/invoices';
import { currentOrganizationState } from '@/core/stores/user/user-organizations';

/** Today and the zone invoices are dated in: the organization's, which its PDFs print, not the browser's. */
export function useInvoiceClock() {
	const organization = useAtomValue(currentOrganizationState);
	const timeZone = organization?.timeZone ?? null;
	const todayKey = todayDayKey(timeZone);
	return { timeZone, todayKey };
}
