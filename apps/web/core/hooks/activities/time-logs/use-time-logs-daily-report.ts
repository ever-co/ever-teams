import { useAtom } from 'jotai';
import { timeLogsDailyReportFetchingState, timeLogsDailyReportState } from '@/core/stores/timer/time-logs';
import { useGetTimeLogsDailyReport } from './use-get-time-logs-daily-report';
import moment from 'moment';
import { useEffect } from 'react';

/**
 * To be used only in the top level component init-state, so we avoid unnecessary re-rendering
 * due to side effects
 */
export function useTimeLogsDailyReport() {
	const [, setTimeLogsDailyReport] = useAtom(timeLogsDailyReportState);
	const [, setTimeLogsDailyReportLoading] = useAtom(timeLogsDailyReportFetchingState);

	const timeLogsDailyReport = useGetTimeLogsDailyReport({
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
		setTimeLogsDailyReportLoading(timeLogsDailyReport.isLoading);
	}, [timeLogsDailyReport.isLoading, setTimeLogsDailyReportLoading]);

	// Track / sync the fetched data
	useEffect(() => {
		if (timeLogsDailyReport.data) {
			setTimeLogsDailyReport(timeLogsDailyReport.data);
		}
	}, [timeLogsDailyReport.data, setTimeLogsDailyReport]);
}
