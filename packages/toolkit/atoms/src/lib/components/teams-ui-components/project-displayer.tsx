import { Card, cn, Progress } from '@ever-teams/toolkit-ui';
import { useTranslation } from 'react-i18next';
import { useStatisticsCounts } from '@hooks/useStatisticsCounts';
import { TeamsDisplayerLoader } from '@components/loaders/displayer-loader';
import { useOrganizationProjects } from '@hooks/useOrganisationProjects';

export interface IProjectDisplayer {
	icon?: React.ReactNode;
	workedprojects?: number;
	totalProjects?: number;
	label: string;
	showProgress?: boolean;
	className?: string;
	loading?: boolean;
}

const TeamsProjectDisplayer: React.FC<IProjectDisplayer> = ({
	icon,
	workedprojects = 0,
	totalProjects = 0,
	loading = false,
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
					<div className="text-xl font-medium ">{workedprojects}</div>
					{showProgress && <Progress className="w-full h-2" value={(workedprojects / totalProjects) * 100} />}
				</>
			)}
		</Card>
	);
};

const TeamsWorkedProjectDisplayer = ({ showProgress, className }: { showProgress?: boolean; className?: string }) => {
	const { t } = useTranslation();

	const { data: organizationProjects } = useOrganizationProjects({ clientId: null });

	const { data: statisticsCounts, loading: statisticsCountsLoading } = useStatisticsCounts();
	return (
		<TeamsProjectDisplayer
			workedprojects={statisticsCounts?.projectsCount}
			totalProjects={organizationProjects?.length}
			loading={statisticsCountsLoading}
			showProgress={showProgress}
			label={t('COMMON.project')}
			className={className}
		/>
	);
};

export { TeamsWorkedProjectDisplayer, TeamsProjectDisplayer };
