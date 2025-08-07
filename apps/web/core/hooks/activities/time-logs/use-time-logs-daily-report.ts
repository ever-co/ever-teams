import { useAtom } from 'jotai';
import { timeLogsDailyReportFetchingState, timeLogsDailyReportState } from '@/core/stores/timer/time-logs';
import { useGetTimeLogsDailyReport } from './use-get-time-logs-daily-report';
import moment from 'moment';
import { useEffect } from 'react';

/**
 * To be used only in the top level component init-state, so we avoid unnecessary re-rendering
 * due to the useEffects
 */
export function useTimeLogsDailyReport() {
	const [, setTimeLogsDailyReport] = useAtom(timeLogsDailyReportState);
	const [, setTimeLogsDailyReportLoading] = useAtom(timeLogsDailyReportFetchingState);

	const todayTimeLogs = useGetTimeLogsDailyReport({
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
		if (todayTimeLogs.isLoading) {
			setTimeLogsDailyReportLoading(todayTimeLogs.isLoading);
		}
	}, [todayTimeLogs.isLoading, setTimeLogsDailyReportLoading]);

	// Track / sync the fetched data
	useEffect(() => {
		if (todayTimeLogs.data) {
			setTimeLogsDailyReport(todayTimeLogs.data);
		}
	}, [todayTimeLogs.data, setTimeLogsDailyReport]);
}
