'use client';

import { useEffect, useState } from 'react';
import { useAtomValue } from 'jotai';
import { todayDayKey } from '@/core/lib/utils/invoices';
import { currentOrganizationState } from '@/core/stores/user/user-organizations';

/** How often a page left open checks whether the organization's day has turned. */
const DAY_CHECK_MS = 60_000;

/** Today and the zone invoices are dated in: the organization's, which its PDFs print, not the browser's. */
export function useInvoiceClock() {
	const organization = useAtomValue(currentOrganizationState);
	const timeZone = organization?.timeZone ?? null;
	// Renders again when the day turns, or when the page comes back into view on another day; a check on the same day
	// sets the same value and renders nothing
	const [, setCheckedDay] = useState(() => todayDayKey(timeZone));
	useEffect(() => {
		const checkDay = () => setCheckedDay(todayDayKey(timeZone));
		checkDay();
		const timer = window.setInterval(checkDay, DAY_CHECK_MS);
		document.addEventListener('visibilitychange', checkDay);
		return () => {
			window.clearInterval(timer);
			document.removeEventListener('visibilitychange', checkDay);
		};
	}, [timeZone]);
	const todayKey = todayDayKey(timeZone);
	return { timeZone, todayKey };
}
