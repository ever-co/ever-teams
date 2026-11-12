'use client';

import { useEffect, useState } from 'react';
import { dayNumberOf } from '@/core/lib/utils/team-tasks-timeline';

/** A second past midnight, so the timer never fires on the last instant of the day it leaves. */
const AFTER_MIDNIGHT_MS = 1000;

function millisecondsToNextMidnight(now: Date) {
	const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
	return nextMidnight.getTime() - now.getTime() + AFTER_MIDNIGHT_MS;
}

/**
 * Today, kept current: it moves at local midnight and when the tab comes back after the day changed (a timer of a
 * sleeping tab can run late), so a today mark and the overdue marks never stay on yesterday.
 */
export function useToday() {
	const [today, setToday] = useState(() => new Date());
	useEffect(() => {
		let timer: ReturnType<typeof setTimeout> | undefined;
		const refresh = () => {
			setToday((current) => {
				const now = new Date();
				const isSameDay = dayNumberOf(now) === dayNumberOf(current);
				if (isSameDay) {
					return current;
				}
				return now;
			});
		};
		const schedule = () => {
			const delay = millisecondsToNextMidnight(new Date());
			timer = setTimeout(() => {
				refresh();
				schedule();
			}, delay);
		};
		const handleVisibility = () => {
			if (document.visibilityState === 'visible') {
				refresh();
			}
		};
		schedule();
		document.addEventListener('visibilitychange', handleVisibility);
		return () => {
			if (timer) {
				clearTimeout(timer);
			}
			document.removeEventListener('visibilitychange', handleVisibility);
		};
	}, []);
	return today;
}
