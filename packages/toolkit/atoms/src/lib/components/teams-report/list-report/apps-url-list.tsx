import { VariantProps } from 'class-variance-authority';
import { TeamsBaseList, teamsBaseListVariants } from './base';
import { useTranslation } from 'react-i18next';
import { useActivitiesStats } from '@hooks/useActivitiesStats';

interface ITeamsAppsUrlListProps extends VariantProps<typeof teamsBaseListVariants> {
	className?: string;
}

const TeamsAppsUrlList = ({ variant, size, className }: ITeamsAppsUrlListProps) => {
	const { t } = useTranslation();

	const { data: activitiesStats, loading: activitiesStatsLoading } = useActivitiesStats();

	return (
		<TeamsBaseList
			stats={{ data: activitiesStats, loading: activitiesStatsLoading }}
			title={t('COMMON.apps_and_url')}
			className={className}
			variant={variant}
			size={size}
		/>
	);
};

export { TeamsAppsUrlList };
