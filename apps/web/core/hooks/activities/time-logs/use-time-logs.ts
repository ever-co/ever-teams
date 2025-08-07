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

	const timeLogs = useGetTimeLogs({
		/**
		 * Get all time logs for the current year for global state across the app (it can be changed if needed)
		 *
		 * Other components can use custom filters by calling `useGetTimeLogsDailyReport(filters)`
		 */
		startDate: moment().startOf('year').toDate(),
		endDate: moment().endOf('year').toDate()
	});

	// Track / sync the fetching state
	useEffect(() => {
		if (timeLogs.isLoading) {
			setTimeLogsLoading(timeLogs.isLoading);
		}
	}, [timeLogs.isLoading, setTimeLogsLoading]);

	// Track / sync the fetched data
	useEffect(() => {
		if (timeLogs.data) {
			setTimeLogs(timeLogs.data);
		}
	}, [timeLogs.data, setTimeLogs]);
}
