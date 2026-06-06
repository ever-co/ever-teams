import { Card, cn, getWeekStartAndEnd, Progress, areDatesEqual } from '@ever-teams/toolkit-ui';
import { useTranslation } from 'react-i18next';
import { useTeamsContext } from '@lib/context/teams-context';
import { useStatisticsCounts } from '@hooks/useStatisticsCounts';
import { TeamsDisplayerLoader } from '@components/loaders/displayer-loader';

interface IActivityDisplayerProps {
	activity?: number;
	loading?: boolean;
	icon?: React.ReactNode;
	label: string;
	showProgress?: boolean;
	className?: string;
}

const TeamsActivityDisplayer: React.FC<IActivityDisplayerProps> = ({
	icon,
	activity = 0,
	loading,
	label,
	showProgress = true,
	className
}) => {
	return (
		<Card
			className={cn(
				'dark:text-white border relative dark:border-gray-600 text-sm rounded-xl p-3 min-w-[150px]  gap-1 inline-flex  flex-col',
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
					{' '}
					<div className="text-xl font-medium ">{activity}%</div>
					{showProgress && <Progress className="w-full h-2" value={activity} />}
				</>
			)}
		</Card>
	);
};

const TeamsDailyActivityDisplayer = ({ showProgress, className }: { showProgress?: boolean; className?: string }) => {
	const { t } = useTranslation();

	const { data: statisticsCounts, loading: statisticsCountsLoading } = useStatisticsCounts();
	return (
		<TeamsActivityDisplayer
			activity={statisticsCounts?.todayActivities}
			loading={statisticsCountsLoading}
			showProgress={showProgress}
			label={t('REPORT.today_activity')}
			className={className}
		/>
	);
};

const TeamsWeeklyActivityDisplayer = ({ showProgress, className }: { showProgress?: boolean; className?: string }) => {
	const dates = getWeekStartAndEnd();
	const { t } = useTranslation();
	const { reportDates } = useTeamsContext();

	const { data: statisticsCounts, loading: statisticsCountsLoading } = useStatisticsCounts();

	return (
		<TeamsActivityDisplayer
			activity={statisticsCounts?.weekActivities}
			loading={statisticsCountsLoading}
			showProgress={showProgress}
			label={
				areDatesEqual(reportDates?.from, dates.start) && areDatesEqual(reportDates?.to, dates.end)
					? t('REPORT.week_activity')
					: t('REPORT.activity_over_period')
			}
			className={className}
		/>
	);
};

export { TeamsDailyActivityDisplayer, TeamsWeeklyActivityDisplayer, TeamsActivityDisplayer };
