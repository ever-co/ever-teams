import { VariantProps } from 'class-variance-authority';
import { TeamsBaseList, teamsBaseListVariants } from './base';
import { useTranslation } from 'react-i18next';
import { useProjectsStats } from '@hooks/useProjectsStats';
import { useTimerOnlyToken } from '@hooks/useTimerOnlyToken';
import { TimerOnlyReportNote } from '@components/teams-ui-components/timer-only-report-note';

interface ITeamsProjectsListProps extends VariantProps<typeof teamsBaseListVariants> {
	className?: string;
}

const TeamsProjectsList = ({ variant, size, className }: ITeamsProjectsListProps) => {
	const { t } = useTranslation();

	const { data: projectsStats, loading: projectsStatsLoading } = useProjectsStats();
	const timerOnly = useTimerOnlyToken();
	if (timerOnly) {
		return <TimerOnlyReportNote label={t('COMMON.project')} className={className} />;
	}

	return (
		<TeamsBaseList
			stats={{ data: projectsStats, loading: projectsStatsLoading }}
			title={t('COMMON.project')}
			className={className}
			variant={variant}
			size={size}
		/>
	);
};

export { TeamsProjectsList };
