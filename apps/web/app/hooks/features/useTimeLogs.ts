import { useRecoilState } from 'recoil';
import { getTimerLogsDailyReportRequestAPI } from '@app/services/client/api/activity/time-logs';
import { useAuthenticateUser } from './useAuthenticateUser';
import { timerLogsDailyReportState } from '@app/stores/time-logs';
import { useQuery } from '../useQuery';
import { useCallback, useEffect } from 'react';
import moment from 'moment';
import { useFirstLoad } from '../useFirstLoad';
import { useUserProfilePage } from '..';

export function useTimeLogs() {
	const { user } = useAuthenticateUser();
	const profile = useUserProfilePage();

	const { firstLoadData: firstLoadTimeLogs, firstLoad } = useFirstLoad();

	const [timerLogsDailyReport, setTimerLogsDailyReport] = useRecoilState(timerLogsDailyReportState);

	const { loading: timerLogsDailyReportLoading, queryCall: queryTimerLogsDailyReport } = useQuery(
		getTimerLogsDailyReportRequestAPI
	);

	const getTimerLogsDailyReport = useCallback(
		(startDate: Date = moment().startOf('year').toDate(), endDate: Date = moment().endOf('day').toDate()) => {
			queryTimerLogsDailyReport({
				tenantId: user?.tenantId ?? '',
				organizationId: user?.employee.organizationId ?? '',
				employeeIds: [profile.member?.employeeId ?? ''],
				startDate,
				endDate,

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
			user?.employee.id,
			user?.employee.organizationId,
			user?.tenantId,
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
