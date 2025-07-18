import { useMemo } from 'react';
import { secondsToTime } from '@/core/lib/helpers/date-and-time';
import { ITimesheetCountsStatistics } from '@/core/types/interfaces/timesheet/timesheet';
import { ITimeLogGroupedDailyReport } from '@/core/types/interfaces/activity/activity-report';
import { useAuthenticateUser } from '../auth';

export interface TimeActivityStats {
	totalHours: string;
	averageActivity: string;
	totalEarnings: string;
	isLoading: boolean;
}

interface UseTimeActivityStatsProps {
	statisticsCounts: ITimesheetCountsStatistics | null;
	rapportDailyActivity: ITimeLogGroupedDailyReport[];
	isManage: boolean;
	loading: boolean;
}

/**
 * Hook to calculate Time & Activity statistics from real data
 * Handles permissions (manager vs regular user) and currency formatting
 */
export function useTimeActivityStats({
	statisticsCounts,
	rapportDailyActivity,
	loading
}: UseTimeActivityStatsProps): TimeActivityStats {
	const { user, isTeamManager } = useAuthenticateUser();

	const stats = useMemo(() => {
		// Return loading state if data is not ready
		if (loading || !statisticsCounts) {
			return {
				totalHours: '0h',
				averageActivity: '0%',
				totalEarnings: '0.00 USD',
				isLoading: true
			};
		}

		// Calculate Total Hours from statisticsCounts.weekDuration (in seconds)
		const totalDurationSeconds = statisticsCounts.weekDuration || 0;
		const { h: hours, m: minutes } = secondsToTime(totalDurationSeconds);
		const totalHours = minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;

		// Calculate Average Activity from statisticsCounts.weekActivities
		const averageActivity = `${Math.round(statisticsCounts.weekActivities || 0)}%`;

		// Calculate Total Earnings based on user permissions and employee rates
		let totalEarnings = '0.00 USD';

		if (rapportDailyActivity && rapportDailyActivity.length > 0) {
			let totalEarningsValue = 0;
			let primaryCurrency = 'USD'; // Default currency

			rapportDailyActivity.forEach((dayReport) => {
				dayReport.logs?.forEach((projectLog) => {
					projectLog.employeeLogs?.forEach((employeeLog) => {
						// Check permissions: managers see all, regular users see only their own data
						const canViewEmployeeData = isTeamManager || user?.employee?.id === employeeLog.employee?.id;

						if (canViewEmployeeData && employeeLog.employee) {
							const employee = employeeLog.employee;
							// IEmployee interface has billRateValue and billRateCurrency
							const billRate = employee.billRateValue || 0;
							const currency = employee.billRateCurrency || 'USD';

							// Use the first non-USD currency found, or keep USD as default
							if (currency !== 'USD' && primaryCurrency === 'USD') {
								primaryCurrency = currency;
							}

							// Calculate earnings: duration (in seconds) * hourly rate
							const durationHours = (employeeLog.sum || 0) / 3600; // Convert seconds to hours
							const employeeEarnings = durationHours * billRate;

							totalEarningsValue += employeeEarnings;
						}
					});
				});
			});

			totalEarnings = `${totalEarningsValue.toFixed(2)} ${primaryCurrency}`;
		}

		return {
			totalHours,
			averageActivity,
			totalEarnings,
			isLoading: false
		};
	}, [statisticsCounts, rapportDailyActivity, user?.employee?.id, loading]);

	return stats;
}
