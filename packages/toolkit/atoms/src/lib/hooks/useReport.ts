import { useEffect, useState } from 'react';

import { ApiCall } from '@ever-teams/api';
import { ChartConfig, ChartData, IWeeklyReports } from '@ever-teams/toolkit-types';
import qs from 'qs';
import { generateChartConfig, getErrorMessage, reportError, toast, transformData } from '@ever-teams/toolkit-ui';
import { useTeamsContext } from '@lib/context/teams-context';

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

	const getReport = async () => {
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

			const report = await ApiCall<IWeeklyReports>({
				path: `/timesheet/time-log/report/weekly?${queryWeeklyReport}`,
				method: 'GET',
				bearer_token: token
			});

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
			toast({
				title: 'Ever Teams Error',
				description: 'Report error : ' + getErrorMessage(error),
				variant: 'destructive'
			});
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		if (user && organizationId) getReport();
	}, [user, date, selectedEmployee, selectedTeam, organizationId]);

	return { report, config, chartData, loading };
};

export { useReport };
