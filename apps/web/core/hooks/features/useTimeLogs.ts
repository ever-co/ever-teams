import { useAtom } from 'jotai';
import { useAuthenticateUser } from './useAuthenticateUser';
import { timerLogsDailyReportState } from '@/core/stores/time-logs';
import { useQuery } from '../useQuery';
import { useCallback, useEffect } from 'react';
import moment from 'moment';
import { useFirstLoad } from '../useFirstLoad';
import { useUserProfilePage } from '..';
import { timeLogService } from '@/core/services/client/api/timesheets/time-log.service';

export function useTimeLogs() {
	const { user } = useAuthenticateUser();
	const profile = useUserProfilePage();

	const { firstLoadData: firstLoadTimeLogs, firstLoad } = useFirstLoad();

	const [timerLogsDailyReport, setTimerLogsDailyReport] = useAtom(timerLogsDailyReportState);

	const { loading: timerLogsDailyReportLoading, queryCall: queryTimerLogsDailyReport } = useQuery(
		timeLogService.getTimerLogsDailyReport
	);

	const getTimerLogsDailyReport = useCallback(
		(startDate: Date = moment().startOf('year').toDate(), endDate: Date = moment().endOf('day').toDate()) => {
			queryTimerLogsDailyReport({
				tenantId: user?.tenantId ?? '',
				organizationId: user?.employee.organizationId ?? '',
				employeeIds: [profile.member?.employeeId ?? ''],
				startDate,
				endDate
			})
				.then((response) => {
					if (response.data && Array.isArray(response.data)) {
						setTimerLogsDailyReport(response.data);
					}
				})
				.catch((error) => {
					console.log(error);
				});
		},
		[
			profile.member?.employeeId,
			queryTimerLogsDailyReport,
			setTimerLogsDailyReport,
			user?.employee.organizationId,
			user?.tenantId
		]
	);

	useEffect(() => {
		if (firstLoad) {
			getTimerLogsDailyReport();
		}
	}, [getTimerLogsDailyReport, firstLoad]);

	return {
		timerLogsDailyReport,
		timerLogsDailyReportLoading,
		firstLoadTimeLogs
	};
}
