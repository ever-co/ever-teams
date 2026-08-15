import { VariantProps } from 'class-variance-authority';
import { TeamsBaseList, teamsBaseListVariants } from './base';
import { useTranslation } from 'react-i18next';
import { useProjectsStats } from '@hooks/useProjectsStats';

interface ITeamsProjectsListProps extends VariantProps<typeof teamsBaseListVariants> {
	className?: string;
}

const TeamsProjectsList = ({ variant, size, className }: ITeamsProjectsListProps) => {
	const { t } = useTranslation();

	const { data: projectsStats, loading: projectsStatsLoading } = useProjectsStats();

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
