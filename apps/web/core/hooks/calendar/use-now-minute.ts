'use client';

import { useEffect, useState } from 'react';
import { nowMinuteOf } from '@/core/lib/utils/calendar-view';

const MINUTE_MS = 60_000;

function currentMinute() {
	const now = new Date();
	return nowMinuteOf(now);
}

/** The minute of the day, read again each minute by the one element that draws it (the now line), never the page. */
export function useNowMinute() {
	const [minute, setMinute] = useState(currentMinute);
	useEffect(() => {
		const interval = window.setInterval(() => {
			const nextMinute = currentMinute();
			setMinute(nextMinute);
		}, MINUTE_MS);
		return () => window.clearInterval(interval);
	}, []);
	return minute;
}
