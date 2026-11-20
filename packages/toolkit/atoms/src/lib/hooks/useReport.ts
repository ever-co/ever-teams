import { useEffect, useState } from 'react';

import { ApiCall } from '@ever-teams/api';
import { ChartConfig, ChartData, IWeeklyReports } from '@ever-teams/toolkit-types';
import qs from 'qs';
import { generateChartConfig, getErrorMessage, reportError, toast, transformData } from '@ever-teams/toolkit-ui';
import { useTeamsContext } from '@lib/context/teams-context';
import { useKitOptions } from '@components/teams-provider/kit-options';
import { useTimerOnlyToken } from '@hooks/useTimerOnlyToken';

const useReport = () => {
	const [report, setReport] = useState<IWeeklyReports | null>(null);
	const [config, setConfig] = useState<ChartConfig>({});

	const [chartData, setChartData] = useState<ChartData[]>([]);
	const [loading, setLoading] = useState<boolean>(false);

	const {
		authenticatedUser: user,
		token,
		selectedEmployee,
		selectedTeam,
		selectedOrganization: organizationId,
		reportDates: date
	} = useTeamsContext();
	const { api } = useKitOptions();
	const timerOnly = useTimerOnlyToken();

	// isCurrent turns false once the effect has moved past this read (other filters or another address, or the widget
	// gone): its answer then shows nothing, not even its error, as the toasts are the page's.
	const getReport = async (isCurrent: () => boolean) => {
		setLoading(true);
		try {
			if (!date) {
				reportError('Invalid dates');
				return;
			}

			if (!user) throw new Error('User is not authenticated');

			const employeeId = user.employee
				? user.employee.id
				: selectedEmployee !== 'all'
					? selectedEmployee
					: undefined;
			const { tenantId } = user;
			const teamId = selectedTeam !== 'all' ? selectedTeam : undefined;

			const queryWeeklyReport = qs.stringify(
				{
					tenantId,
					organizationId,
					'activityLevel[start]': 0,
					'activityLevel[end]': 100,
					startDate: date?.from?.toISOString(),
					endDate: date?.to?.toISOString(),
					timeZone: user?.timeZone?.split(' ')[0] || Intl.DateTimeFormat().resolvedOptions().timeZone,
					...(employeeId ? { employeeIds: [employeeId] } : {}),
					...(teamId ? { teamIds: [teamId] } : {})
				},
				{ skipNulls: true }
			);

			const report = await ApiCall<IWeeklyReports>(
				{
					path: `/timesheet/time-log/report/weekly?${queryWeeklyReport}`,
					method: 'GET',
					bearer_token: token
				},
				api
			);
			if (!isCurrent()) {
				return;
			}

			if ('data' in report) {
				setReport(report.data);
				setConfig(generateChartConfig(report.data));
				setChartData(transformData(report.data));
			} else {
				toast({
					title: 'Ever Teams Error',
					description: report.message || report.error,
					variant: 'destructive'
				});
			}
		} catch (error) {
			if (!isCurrent()) {
				return;
			}
			toast({
				title: 'Ever Teams Error',
				description: 'Report error : ' + getErrorMessage(error),
				variant: 'destructive'
			});
		} finally {
			if (isCurrent()) {
				setLoading(false);
			}
		}
	};

	useEffect(() => {
		// An embed token reaches the timer only: no read, so no refusal to show (#5602)
		if (timerOnly) {
			return;
		}
		let current = true;
		if (user && organizationId) void getReport(() => current);
		return () => {
			current = false;
			// The next read, if any, sets it again
			setLoading(false);
		};
	}, [user, date, selectedEmployee, selectedTeam, organizationId, timerOnly, api]);

	return { report, config, chartData, loading };
};

export { useReport };
