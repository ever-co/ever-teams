import { useAtom } from 'jotai';
import { timerLogsDailyReportState } from '@/core/stores/timer/time-logs';
import moment from 'moment';
import { useGetTimeLogsDailyReport } from './use-get-time-logs-daily-report';
import { useConditionalUpdateEffect } from '../../common';

export function useTimeLogs() {
	const [timeLogsDailyReport, setTimeLogsDailyReport] = useAtom(timerLogsDailyReportState);

	const todayTimeLogs = useGetTimeLogsDailyReport({
		// Get today's time logs (by default)
		startDate: moment().startOf('day').toDate(),
		endDate: moment().endOf('day').toDate()
	});

	// Jotai synchronization : Only if the data change
	useConditionalUpdateEffect(
		() => {
			if (todayTimeLogs.data && Array.isArray(todayTimeLogs.data)) {
				setTimeLogsDailyReport(todayTimeLogs.data);
			}
		},
		[todayTimeLogs.data, setTimeLogsDailyReport],
		timeLogsDailyReport?.length !== todayTimeLogs.data?.length
	);

	return {
		timeLogsDailyReport,
		timeLogsDailyReportLoading: todayTimeLogs.isLoading
	};
}
