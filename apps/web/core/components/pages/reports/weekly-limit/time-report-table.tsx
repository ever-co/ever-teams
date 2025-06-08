import { DataTableWeeklyLimits } from './data-table';
import { DEFAULT_WORK_HOURS_PER_DAY } from '@/core/constants/config/constants';
import moment from 'moment';
import { JSX } from 'react';
import { TTimeLimitReportByEmployee, TTimeLimitReportList } from '@/core/types/schemas';

export interface ITimeReportTableProps {
	report: TTimeLimitReportList;
	displayMode: 'week' | 'date';
	organizationLimits: { [key: string]: number };
	indexTitle: string;
	header: JSX.Element;
}

/**
 * Renders a time report table displaying employee time tracking data.
 *
 * @component
 * @param {IProps} props - The component props.
 * @param {ITimeLimitReport} props.report - Data for employees' time usage reports.
 * @param {'week' | 'date'} props.displayMode - Specifies whether to display data by week or day.
 * @param {{ [key: string]: number }} props.organizationLimits - Contains organizational limits for time usage, specified by mode.
 * @param {JSX.Element} - props.header - The table header
 *
 * @returns {JSX.Element} A formatted report table showing time usage and limits.
 */
export const TimeReportTable = ({
	report,
	displayMode,
	organizationLimits,
	indexTitle,
	header
}: ITimeReportTableProps) => (
	<div className="w-full p-1" key={report.date}>
		<div className="flex items-center h-12 px-4 border rounded-md bg-slate-100 dark:bg-gray-800 dark:text-white">
			{header}
		</div>
		<div>
			<DataTableWeeklyLimits
				data={report.employees?.map((item) => {
					const limit = item.limit || organizationLimits[displayMode] || DEFAULT_WORK_HOURS_PER_DAY;
					const percentageUsed = (item.duration / limit) * 100;
					const remaining = limit - item.duration;

					return {
						indexValue: item.employee?.fullName || '',
						limit,
						percentageUsed,
						timeSpent: item.duration,
						remaining
					};
				})}
				indexTitle={indexTitle}
			/>
		</div>
	</div>
);

interface ITimeReportTableByMemberProps {
	report: TTimeLimitReportByEmployee;
	displayMode: 'week' | 'date';
	organizationLimits: { [key: string]: number };
	indexTitle: string;
	header: JSX.Element;
}

/**
 * Renders a time report table displaying time tracking data grouped by employee.
 *
 * @component
 * @param {IProps} props - The component props.
 * @param {ITimeLimitReportByEmployee} props.report - Data for employees' time usage reports.
 * @param {'week' | 'date'} props.displayMode - Specifies whether to display data by week or day.
 * @param {{ [key: string]: number }} props.organizationLimits - Contains organizational limits for time usage, specified by mode.
 * @param {JSX.Element} - props.header - The table header
 *
 * @returns {JSX.Element} A formatted report table showing time usage and limits.
 */
export const TimeReportTableByMember = ({
	report,
	displayMode,
	organizationLimits,
	indexTitle,
	header
}: ITimeReportTableByMemberProps) => (
	<div className="w-full p-1" key={report.employee.id}>
		<div className="flex items-center h-12 px-4 border rounded-md bg-slate-100 dark:bg-gray-800 dark:text-white">
			{header}
		</div>
		<div>
			<DataTableWeeklyLimits
				data={report.reports?.map((item) => {
					const limit = item.limit || organizationLimits[displayMode] || DEFAULT_WORK_HOURS_PER_DAY;
					const percentageUsed = limit > 0 ? (item.duration / limit) * 100 : 0;
					const remaining = Math.max(0, limit - item.duration);

					return {
						indexValue:
							displayMode == 'week'
								? `${item.date} - ${moment(item.date).endOf('week').format('YYYY-MM-DD')}`
								: item.date,
						limit,
						percentageUsed,
						timeSpent: item.duration,
						remaining
					};
				})}
				indexTitle={indexTitle}
			/>
		</div>
	</div>
);

/**
 * A helper function that groups employee data by employee ID, consolidating their reports across multiple dates.
 *
 * @param {Array} data - An array of objects representing daily employee reports.
 * @param {string} data[].date - The date of the report.
 * @param {Array} data[].employees - A list of employees with their work details for the day.
 * @returns {ITimeLimitReportByEmployee[]} - An array of grouped employee reports, each containing the employee details and their corresponding reports.

 */
export function groupDataByEmployee(data: TTimeLimitReportList[]): TTimeLimitReportByEmployee[] {
	const grouped = new Map<string, TTimeLimitReportByEmployee>();

	data.forEach((day) => {
		const date = day.date;
		day.employees.forEach((emp) => {
			const empId = emp.employee.id;

			if (!grouped.has(empId)) {
				// Initialize new employee entry in the Map
				grouped.set(empId, {
					employee: {
						...emp.employee,
						isTrackingEnabled: emp.employee.isTrackingEnabled ?? false
					},
					reports: []
				});
			}

			// Add the report for the current date
			grouped.get(empId)?.reports.push({
				date: date,
				duration: emp.duration,
				durationPercentage: emp.durationPercentage,
				limit: emp.limit
			});
		});
	});

	// Convert Map values to an array
	return Array.from(grouped.values());
}
