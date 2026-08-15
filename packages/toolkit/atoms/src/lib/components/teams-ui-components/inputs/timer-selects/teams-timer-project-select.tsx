import { Select, Tooltip } from '@ever-teams/toolkit-ui';
import { ICurrentTeamsState } from '@ever-teams/toolkit-types';

import { useTranslation } from 'react-i18next';
import { useOrganizationProjects } from '@hooks/useOrganisationProjects';

export const TeamsTimerProjectSelect = ({
	size,
	isTimerRunning,
	currentTeamsState,
	setCurrentTeamsState
}: {
	size?: 'default' | 'sm' | 'lg' | null;
	isTimerRunning?: boolean;
	currentTeamsState: ICurrentTeamsState;
	setCurrentTeamsState: React.Dispatch<React.SetStateAction<ICurrentTeamsState>>;
}) => {
	const { t } = useTranslation();

	const { data: organizationProjects, loading: projectsLoading } = useOrganizationProjects({
		clientId: currentTeamsState?.clientId || null
	});

	return (
		<div className=" flex flex-col gap-2 ">
			<label htmlFor="project" className="text-sm ">
				{t('COMMON.project')}
			</label>
			<Tooltip
				message={isTimerRunning ? t('WARNING.stop_timer_before_selecting', { item: t('COMMON.project') }) : ''}
			>
				<Select
					loading={projectsLoading}
					name="project"
					disabled={isTimerRunning}
					size={size}
					placeholder={t('INPUT.project_select.select_project')}
					value={currentTeamsState?.projectId || undefined}
					defaultValue={currentTeamsState?.projectId || undefined}
					values={
						organizationProjects && organizationProjects[0]
							? organizationProjects?.map((project) => {
									return { value: project.id, label: project.name };
								})
							: undefined
					}
					onValueChange={(e) => {
						setCurrentTeamsState((state: ICurrentTeamsState) => {
							return {
								...state,
								projectId: e
							};
						});
					}}
				/>
			</Tooltip>
		</div>
	);
};
