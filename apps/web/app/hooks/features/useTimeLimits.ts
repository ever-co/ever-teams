import { timeLimitsAtom } from '@/app/stores/time-limits';
import { useAtom } from 'jotai';
import { useQuery } from '../useQuery';
import { getTimeLimitsReportAPI } from '@/app/services/client/api/activity/time-limits';
import { useCallback } from 'react';
import { IGetTimeLimitReport } from '@/app/interfaces/ITimeLimits';

export function useTimeLimits() {
	const [timeLimitsReports, setTimeLimitsReport] = useAtom(timeLimitsAtom);

	const { queryCall: getTimeLimitsReportQueryCall, loading: getTimeLimitReportLoading } =
		useQuery(getTimeLimitsReportAPI);

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
