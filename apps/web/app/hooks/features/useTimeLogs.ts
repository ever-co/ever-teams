import { useRecoilState } from 'recoil';
import { getTimerLogsDailyReportRequestAPI } from '@app/services/client/api/activity/time-logs';
import { useAuthenticateUser } from './useAuthenticateUser';
import { timerLogsDailyReportState } from '@app/stores/time-logs';
import { useQuery } from '../useQuery';
import { useCallback, useEffect } from 'react';
import moment from 'moment';

export function useTimeLogs() {
	const { user } = useAuthenticateUser();
	const [timerLogsDailyReport, setTimerLogsDailyReport] = useRecoilState(timerLogsDailyReportState);

	const { loading: timerLogsDailyReportLoading, queryCall: queryTimerLogsDailyReport } = useQuery(
		getTimerLogsDailyReportRequestAPI
	);

	const getTimerLogsDailyReport = useCallback(
		(startDate: Date = moment().startOf('year').toDate(), endDate: Date = moment().endOf('day').toDate()) => {
			queryTimerLogsDailyReport({
				tenantId: user?.tenantId ?? '',
				organizationId: user?.employee.organizationId ?? '',
				employeeId: user?.employee.id ?? '',
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
			queryTimerLogsDailyReport,
			setTimerLogsDailyReport,
			user?.employee.id,
			user?.employee.organizationId,
			user?.tenantId
		]
	);

	useEffect(() => {
		getTimerLogsDailyReport();
	}, [getTimerLogsDailyReport]);

	return {
		timerLogsDailyReport,
		timerLogsDailyReportLoading
	};
}
