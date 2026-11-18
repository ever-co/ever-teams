import { useEffect, useState } from 'react';
import { Select, Tooltip } from '@ever-teams/toolkit-ui';
import { ICurrentTeamsState, IHookResponse, IProject } from '@ever-teams/toolkit-types';
import { EmbedProject } from '@ever-teams/api';

import { useTranslation } from 'react-i18next';
import { useOrganizationProjects } from '@hooks/useOrganisationProjects';
import { IEmbedProjects, useEmbedProjects } from '@hooks/useEmbedProjects';
import { useKitOptions } from '@components/teams-provider/kit-options';

// With the host's getToken the picker lists the embed projects (the member's projects are not read then)
function projectsOfMode(
	hostSignIn: boolean | undefined,
	memberProjects: IHookResponse<IProject[]>,
	embedProjects: IEmbedProjects
): IHookResponse<EmbedProject[]> {
	if (hostSignIn) {
		return embedProjects;
	}
	return memberProjects;
}

// What the list of the embed projects says while it shows none; without getToken the select keeps its own words
function emptyMessageKeyOf(hostSignIn: boolean | undefined, embedProjects: IEmbedProjects) {
	if (!hostSignIn) {
		return undefined;
	}
	if (embedProjects.loading) {
		return 'INPUT.project_select.loading_projects' as const;
	}
	if (embedProjects.failed) {
		return 'INPUT.project_select.projects_failed' as const;
	}
	return 'INPUT.project_select.no_projects' as const;
}

/**
 * With the host's getToken, whether the project the timer remembers from an earlier entry is one this token may not
 * track time on: the API would refuse a start on it. Any list the API answered decides, an empty one too; an API
 * without the route, a read still running or one that failed decide nothing.
 */
function isRememberedProjectRefused(projectId: string | null | undefined, embedProjects: IEmbedProjects): boolean {
	const listed = embedProjects.data;
	if (!listed || embedProjects.unavailable || !projectId) {
		return false;
	}
	return !listed.some((project) => project.id === projectId);
}

/**
 * The timer's state with another project (or none). With the host's getToken the task and client pickers list
 * nothing, so the person cannot change the task or client remembered from an earlier entry: they belong to the earlier
 * project, and go with it (the API refuses a start with a task of another project).
 */
function withProject(
	state: ICurrentTeamsState,
	projectId: string | null,
	hostSignIn: boolean | undefined
): ICurrentTeamsState {
	const isSameProject = state.projectId === projectId;
	if (!hostSignIn || isSameProject) {
		return { ...state, projectId };
	}
	return { ...state, projectId, taskId: null, clientId: null };
}

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

	const { hostSignIn } = useKitOptions();
	const memberProjects = useOrganizationProjects({
		clientId: currentTeamsState?.clientId || null
	});
	const embedProjects = useEmbedProjects();
	const { data: organizationProjects, loading: projectsLoading } = projectsOfMode(
		hostSignIn,
		memberProjects,
		embedProjects
	);
	const emptyMessageKey = emptyMessageKeyOf(hostSignIn, embedProjects);
	const rememberedProjectId = currentTeamsState?.projectId;
	// Counts the projects let go: a new select shows its placeholder on every Radix version (before 2.3.0, a
	// controlled select reset to '' could keep the label of the project it showed).
	const [lettingGo, setLettingGo] = useState(0);

	useEffect(() => {
		const isRefused = isRememberedProjectRefused(rememberedProjectId, embedProjects);
		const mayLetGo = Boolean(hostSignIn) && !isTimerRunning;
		if (!mayLetGo || !isRefused) {
			return;
		}
		setCurrentTeamsState((state: ICurrentTeamsState) => withProject(state, null, hostSignIn));
		setLettingGo((count) => count + 1);
	}, [hostSignIn, isTimerRunning, rememberedProjectId, embedProjects, setCurrentTeamsState]);

	return (
		<div className=" flex flex-col gap-2 ">
			<label htmlFor="project" className="text-sm ">
				{t('COMMON.project')}
			</label>
			<Tooltip
				message={isTimerRunning ? t('WARNING.stop_timer_before_selecting', { item: t('COMMON.project') }) : ''}
			>
				<Select
					key={lettingGo}
					loading={projectsLoading}
					name="project"
					disabled={isTimerRunning}
					size={size}
					placeholder={t('INPUT.project_select.select_project')}
					emptyMessage={emptyMessageKey && t(emptyMessageKey)}
					// An empty value shows the placeholder again once a project is let go: undefined would keep the old one
					value={currentTeamsState?.projectId ?? ''}
					defaultValue={currentTeamsState?.projectId || undefined}
					values={
						organizationProjects && organizationProjects[0]
							? organizationProjects?.map((project) => {
									return { value: project.id, label: project.name };
								})
							: undefined
					}
					onValueChange={(e) => {
						setCurrentTeamsState((state: ICurrentTeamsState) => withProject(state, e, hostSignIn));
					}}
				/>
			</Tooltip>
		</div>
	);
};
