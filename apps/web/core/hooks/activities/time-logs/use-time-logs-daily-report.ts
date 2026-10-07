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
		 * Global preload for the app shell — CURRENT MONTH only (2026-08-17, owner: "paging and good
		 * performance everywhere"). This used to request the whole YEAR of the organization's daily report on
		 * every app load, while its only consumer is the "Stats" tab COUNT on the profile page; the Stats tab
		 * content (ActivityCalendar) fetches its own year range on demand with a year selector.
		 *
		 * Other components can use custom filters by calling `useGetTimeLogsDailyReport(filters)`
		 */
		startDate: moment().startOf('month').toDate(),
		endDate: moment().endOf('month').toDate()
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
