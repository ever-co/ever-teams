import { ITimeLimitReport } from '@/app/interfaces/ITimeLimits';
import { DataTableWeeklyLimits } from './data-table';
import moment from 'moment';
import { DEFAULT_WORK_HOURS_PER_DAY } from '@/app/constants';

interface IProps {
	report: ITimeLimitReport;
	displayMode: 'Week' | 'Day';
	organizationLimits: { [key: string]: number };
}

/**
 * Renders a time report table displaying employee time tracking data.
 *
 * @component
 * @param {IProps} props - The component props.
 * @param {ITimeLimitReport} props.report - Data for employees' time usage reports.
 * @param {'Week' | 'Day'} props.displayMode - Specifies whether to display data by week or day.
 * @param {{ [key: string]: number }} props.organizationLimits - Contains organizational limits for time usage, specified by mode.
 *
 * @returns {JSX.Element} A formatted report table showing time usage and limits.
 */
export const TimeReportTable = ({ report, displayMode, organizationLimits }: IProps) => (
	<div className="w-full p-1" key={report.date}>
		<div className="h-12 px-4 bg-slate-100 dark:bg-gray-800 dark:text-white rounded-md flex border items-center">
			<h4 className="text-xs font-medium">
				{displayMode === 'Week' ? (
					<>
						<span>{report.date}</span> <span>-</span>
						<span>{moment(report.date).endOf('week').format('YYYY-MM-DD')}</span>
					</>
				) : (
					report.date
				)}
			</h4>
		</div>
		<div>
			<DataTableWeeklyLimits
				data={report.employees?.map((item) => {
					const limit = item.limit || organizationLimits[displayMode] || DEFAULT_WORK_HOURS_PER_DAY;
					const percentageUsed = (item.duration / limit) * 100;
					const remaining = limit - item.duration;

					return {
						member: item.employee.fullName,
						limit,
						percentageUsed,
						timeSpent: item.duration,
						remaining
					};
				})}
			/>
		</div>
	</div>
);
