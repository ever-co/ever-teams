import { timeLogsState, timeLogsFetchingState } from '@/core/stores';
import { useAtom } from 'jotai';
import { useGetTimeLogs } from './use-get-time-logs';
import moment from 'moment';
import { useEffect } from 'react';

/**
 * To be used only in the top level component init-state, so we avoid unnecessary re-rendering
 * due to side effects
 */
export function useTimeLogs() {
	const [, setTimeLogs] = useAtom(timeLogsState);
	const [, setTimeLogsLoading] = useAtom(timeLogsFetchingState);

	const timeLogs = useGetTimeLogs(
		{
			/**
			 * Get all time logs for the current year for global state across the app (it can be changed if needed)
			 *
			 * Other components can use custom filters by calling `useGetTimeLogsDailyReport(filters)`
			 */
			startDate: moment().startOf('year').toDate(),
			endDate: moment().endOf('year').toDate()
		},
		{
			// OFF by default (2026-08-17): this fetched EVERY time log of the whole organization for the
			// whole year, with 6 relations, on every app load — the single heaviest request of the dashboard
			// (WEB-008; it timed out at 60 s on demo) — and `timeLogsState` has no consumer anywhere in
			// apps/web. Gated, not removed: NEXT_PUBLIC_PRELOAD_YEAR_TIME_LOGS=true restores it.
			enabled: process.env.NEXT_PUBLIC_PRELOAD_YEAR_TIME_LOGS === 'true'
		}
	);

	// Track / sync the fetching state
	useEffect(() => {
		setTimeLogsLoading(timeLogs.isLoading);
	}, [timeLogs.isLoading, setTimeLogsLoading]);

	// Track / sync the fetched data
	useEffect(() => {
		if (timeLogs.data) {
			setTimeLogs(timeLogs.data);
		}
	}, [timeLogs.data, setTimeLogs]);
}
