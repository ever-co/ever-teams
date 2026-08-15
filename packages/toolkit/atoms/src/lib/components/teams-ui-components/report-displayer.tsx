import React from 'react';
import { Card, cn, formatTime, getWeekStartAndEnd, Progress, areDatesEqual } from '@ever-teams/toolkit-ui';
import { useTeamsContext } from '@lib/context/teams-context';
import { useTranslation } from 'react-i18next';
import { useStatisticsCounts } from '@hooks/useStatisticsCounts';
import { TeamsDisplayerLoader } from '@components/loaders/displayer-loader';

export interface IReportDisplayer {
	workedTime?: number | undefined;
	icon?: React.ReactNode;
	label: string;
	showProgress?: boolean;
	maxWorkHours: number;
	className?: string;
	loading?: boolean;
}

/**
 * A component that displays a report of the time worked
 * @param {{ icon?: React.ReactNode, workedTime?: number, label: string, showProgress?: boolean, maxWorkHours?: number }} props
 * @param {React.ReactNode} [props.icon] An optional icon to display
 * @param {number} [props.workedTime=0] The time worked in seconds
 * @param {string} props.label The label of the report
 * @param {boolean} [props.showProgress=true] Whether to show a progress bar
 * @param {number} [props.maxWorkHours=8] The maximum number of hours worked
 * @returns {React.JSX.Element} The report component
 */
const TeamsReportDisplayer: React.FC<IReportDisplayer> = ({
	icon,
	workedTime = 0,
	label,
	showProgress = true,
	maxWorkHours = 8,
	loading = false,
	className
}) => {
	return (
		<Card
			className={cn(
				'dark:text-white border relative dark:border-gray-600 text-sm rounded-xl p-3 min-w-[150px] w-fit  gap-1 inline-flex  flex-col',
				className
			)}
		>
			<div className="flex justify-between items-center dark:text-white/50 text-gray-400">
				<span className="text-xs">{label}</span>
				<span>{icon}</span>
			</div>

			{loading ? (
				<TeamsDisplayerLoader showProgress={showProgress} />
			) : (
				<>
					<div className="text-xl font-medium ">{formatTime(workedTime)}</div>
					{showProgress && (
						<Progress className="w-full h-2" value={(workedTime * 100) / (maxWorkHours * 60 * 60)} />
					)}
				</>
			)}
		</Card>
	);
};

/**
 * A component that displays a report of the time worked today
 * @param {{ showProgress?: boolean }} props
 * @param {boolean} [props.showProgress=true] Whether to show a progress bar
 * @returns {React.JSX.Element} The report component
 */
const TeamsDailyWorkedTimeDisplayer = ({
	showProgress = true,
	className
}: {
	showProgress?: boolean;
	className?: string;
}) => {
	const { t } = useTranslation();

	const { data: statisticsCounts, loading: statisticsCountsLoading } = useStatisticsCounts();
	return (
		<TeamsReportDisplayer
			workedTime={statisticsCounts?.todayDuration}
			label={t('REPORT.worked_today')}
			showProgress={showProgress}
			maxWorkHours={8}
			className={className}
			loading={statisticsCountsLoading}
		/>
	);
};

/**
 * A component that displays a report of the time worked in current week
 * @param {{ showProgress?: boolean }} props
 * @param {boolean} [props.showProgress=true] Whether to show a progress bar
 * @returns {React.JSX.Element} The report component
 */
const TeamsWeeklyWorkedTimeDisplayer = ({
	showProgress = true,
	className
}: {
	showProgress?: boolean;
	className?: string;
}) => {
	const dates = getWeekStartAndEnd();
	const { t } = useTranslation();
	const { reportDates } = useTeamsContext();

	const { data: statisticsCounts, loading: statisticsCountsLoading } = useStatisticsCounts();
	return (
		<TeamsReportDisplayer
			workedTime={statisticsCounts?.weekDuration}
			label={
				areDatesEqual(reportDates?.from, dates.start) && areDatesEqual(reportDates?.to, dates.end)
					? t('REPORT.worked_this_week')
					: t('REPORT.worked_over_period')
			}
			showProgress={showProgress}
			maxWorkHours={40}
			className={className}
			loading={statisticsCountsLoading}
		/>
	);
};

TeamsReportDisplayer.displayName = 'TeamsReportDisplayer';
TeamsDailyWorkedTimeDisplayer.displayName = 'TeamsDailyWorkedTimeDisplayer';
TeamsWeeklyWorkedTimeDisplayer.displayName = 'TeamsWeeklyWorkedTimeDisplayer';

export { TeamsReportDisplayer, TeamsDailyWorkedTimeDisplayer, TeamsWeeklyWorkedTimeDisplayer };
