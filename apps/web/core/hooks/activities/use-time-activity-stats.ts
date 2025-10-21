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
	isManage,
	loading
}: UseTimeActivityStatsProps): TimeActivityStats {
	const { user } = useAuthenticateUser();

	// Memoize user employee ID to prevent unnecessary re-renders
	const userEmployeeId = useMemo(() => user?.employee?.id, [user?.employee?.id]);

	// Memoize total hours calculation
	const totalHours = useMemo(() => {
		if (!statisticsCounts) return '0h';
		const totalDurationSeconds = statisticsCounts.weekDuration || 0;
		const { hours: hours, minutes: minutes } = secondsToTime(totalDurationSeconds);
		return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
	}, [statisticsCounts?.weekDuration]);

	// Memoize average activity calculation
	const averageActivity = useMemo(() => {
		if (!statisticsCounts) return '0%';
		return `${Math.round(statisticsCounts.weekActivities || 0)}%`;
	}, [statisticsCounts?.weekActivities]);

	// Memoize earnings calculation with optimized logic
	const totalEarnings = useMemo(() => {
		if (!rapportDailyActivity || rapportDailyActivity.length === 0) {
			return '0.00 USD';
		}

		let totalEarningsValue = 0;
		let primaryCurrency = 'USD';

		// Optimized single loop with early currency detection
		for (const dayReport of rapportDailyActivity) {
			if (!dayReport.logs) continue;

			for (const projectLog of dayReport.logs) {
				if (!projectLog.employeeLogs) continue;

				for (const employeeLog of projectLog.employeeLogs) {
					// Check permissions: managers see all, regular users see only their own data
					const canViewEmployeeData = isManage || userEmployeeId === employeeLog.employee?.id;

					if (canViewEmployeeData && employeeLog.employee) {
						const employee = employeeLog.employee;
						const billRate = employee.billRateValue || 0;
						const currency = employee.billRateCurrency || 'USD';

						// Set primary currency on first non-USD currency found
						if (currency !== 'USD' && primaryCurrency === 'USD') {
							primaryCurrency = currency;
						}

						// Calculate earnings: duration (in seconds) * hourly rate
						const durationHours = (employeeLog.sum || 0) / 3600;
						totalEarningsValue += durationHours * billRate;
					}
				}
			}
		}

		return `${totalEarningsValue.toFixed(2)} ${primaryCurrency}`;
	}, [rapportDailyActivity, isManage, userEmployeeId]);

	// Combine all memoized values
	const stats = useMemo(() => {
		if (loading || !statisticsCounts) {
			return {
				totalHours: '0h',
				averageActivity: '0%',
				totalEarnings: '0.00 USD',
				isLoading: loading
			};
		}

		return {
			totalHours,
			averageActivity,
			totalEarnings,
			isLoading: loading
		};
	}, [loading, statisticsCounts, totalHours, averageActivity, totalEarnings]);

	return stats;
}
