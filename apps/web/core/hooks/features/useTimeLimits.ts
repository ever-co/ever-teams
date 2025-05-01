import { timeLimitsAtom } from '@/core/stores/time-limits';
import { useAtom } from 'jotai';
import { useQuery } from '../useQuery';
import { useCallback } from 'react';
import { IGetTimeLimitReport } from '@/core/types/interfaces/ITimeLimits';
import { timeLimitsService } from '@/core/services/client/api/activity';

export function useTimeLimits() {
	const [timeLimitsReports, setTimeLimitsReport] = useAtom(timeLimitsAtom);

	const { queryCall: getTimeLimitsReportQueryCall, loading: getTimeLimitReportLoading } = useQuery(
		timeLimitsService.getTimeLimitsReport
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
