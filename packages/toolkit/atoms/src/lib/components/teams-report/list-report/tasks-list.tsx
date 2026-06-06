import { VariantProps } from 'class-variance-authority';
import { TeamsBaseList, teamsBaseListVariants } from './base';
import { useTranslation } from 'react-i18next';
import { useTasksStats } from '@hooks/useTasksStats';

interface ITeamsTasksListProps extends VariantProps<typeof teamsBaseListVariants> {
	className?: string;
}

const TeamsTasksList = ({ variant, size, className }: ITeamsTasksListProps) => {
	const { t } = useTranslation();

	const { data: tasksStats, loading: tasksStatsLoading } = useTasksStats();

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
