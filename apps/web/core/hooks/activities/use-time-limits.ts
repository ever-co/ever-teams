import { timeLimitsAtom } from '@/core/stores/time-limits';
import { useAtom } from 'jotai';
import { useQuery } from '../common/use-query';
import { useCallback } from 'react';
import { IGetTimeLimitReport } from '@/core/types/interfaces/ITimeLimits';
import { timeLogService } from '@/core/services/client/api/timesheets/time-log.service';

export function useTimeLimits() {
	const [timeLimitsReports, setTimeLimitsReport] = useAtom(timeLimitsAtom);

	const { queryCall: getTimeLimitsReportQueryCall, loading: getTimeLimitReportLoading } = useQuery(
		timeLogService.getTimeLimitsReport
	);

	const getTimeLimitsReport = useCallback(
		async (data: IGetTimeLimitReport) => {
			try {
				const res = await getTimeLimitsReportQueryCall(data);

				setTimeLimitsReport(res.data);
			} catch (error) {
				console.error(error);
			}
		},
		[getTimeLimitsReportQueryCall, setTimeLimitsReport]
	);

	return {
		getTimeLimitReportLoading,
		getTimeLimitsReport,
		timeLimitsReports
	};
}
