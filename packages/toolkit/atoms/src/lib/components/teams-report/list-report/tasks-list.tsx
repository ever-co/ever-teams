import { VariantProps } from 'class-variance-authority';
import { TeamsBaseList, teamsBaseListVariants } from './base';
import { useTranslation } from 'react-i18next';
import { useTasksStats } from '@hooks/useTasksStats';
import { useTimerOnlyToken } from '@hooks/useTimerOnlyToken';
import { TimerOnlyReportNote } from '@components/teams-ui-components/timer-only-report-note';

interface ITeamsTasksListProps extends VariantProps<typeof teamsBaseListVariants> {
	className?: string;
}

const TeamsTasksList = ({ variant, size, className }: ITeamsTasksListProps) => {
	const { t } = useTranslation();

	const { data: tasksStats, loading: tasksStatsLoading } = useTasksStats();
	const timerOnly = useTimerOnlyToken();
	if (timerOnly) {
		return <TimerOnlyReportNote label={t('COMMON.task')} className={className} />;
	}

	return (
		<TeamsBaseList
			stats={{ data: tasksStats, loading: tasksStatsLoading }}
			title={t('COMMON.task')}
			className={className}
			variant={variant}
			size={size}
		/>
	);
};

export { TeamsTasksList };
