'use client';

import { ReactNode, useId } from 'react';
import { useTranslations } from 'next-intl';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/core/components/common/select';
import { Spinner } from '@/core/components/icons';
import { useOptimisticSetting } from '@/core/hooks/settings/use-optimistic-setting';
import { SettingsRow, SettingsSection, SettingsSurface } from '@/core/components/settings/kit/settings-page';
import { teamDefaultProjectId } from '@/core/lib/helpers/team-default-project';
import type { TOrganizationTeam } from '@/core/types/schemas';

type TeamProject = { id: string; name?: string | null };

function teamProjectsOf(team: TOrganizationTeam): TeamProject[] {
	const projects = team.projects ?? [];
	return projects.map((project) => ({ id: project.id, name: project.name }));
}

function projectNameOf(projects: TeamProject[], projectId: string | null): string | null {
	const project = projects.find((candidate) => candidate.id === projectId);
	return project?.name ?? null;
}

function DefaultProjectValue({ name }: Readonly<{ name: string | null }>) {
	const t = useTranslations();
	if (!name) {
		return <span className="text-[13px] text-muted-foreground">{t('settings.teamGeneral.NOT_SET')}</span>;
	}
	return <span className="max-w-56 truncate text-[13px] text-foreground">{name}</span>;
}

function DefaultProjectSelect({
	id,
	projects,
	projectId,
	onSave
}: Readonly<{
	id: string;
	projects: TeamProject[];
	projectId: string | null;
	onSave: (projectId: string) => Promise<void>;
}>) {
	const t = useTranslations();
	const { value, isPending, change } = useOptimisticSetting<string>(projectId ?? '', onSave);

	let valueLabel: ReactNode = undefined;
	const selectedName = projectNameOf(projects, value);
	if (selectedName) {
		valueLabel = selectedName;
	}

	return (
		<div className="flex items-center gap-2">
			{isPending && <Spinner aria-hidden="true" className="size-3.5 animate-spin text-muted-foreground" />}
			<Select
				value={value}
				onValueChange={(next) => {
					if (next) {
						void change(next);
					}
				}}
				disabled={isPending}
			>
				<SelectTrigger id={id} className="h-8 w-56 text-[13px]">
					<SelectValue placeholder={t('settings.teamGeneral.DEFAULT_PROJECT_PLACEHOLDER')}>
						{valueLabel}
					</SelectValue>
				</SelectTrigger>
				<SelectContent align="end">
					{projects.map((project) => (
						<SelectItem key={project.id} value={project.id} className="text-[13px]">
							{project.name}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);
}

interface TeamDefaultProjectSectionProps {
	team: TOrganizationTeam;
	canEdit: boolean;
	saveDefaultProject: (projectId: string) => Promise<void>;
}

export function TeamDefaultProjectSection({
	team,
	canEdit,
	saveDefaultProject
}: Readonly<TeamDefaultProjectSectionProps>) {
	const t = useTranslations();
	const selectId = useId();
	const projects = teamProjectsOf(team);
	const projectId = teamDefaultProjectId(team);
	const hasProjects = projects.length > 0;
	const canChoose = canEdit && hasProjects;

	let control = <DefaultProjectValue name={projectNameOf(projects, projectId)} />;
	let labelTarget: string | undefined = undefined;
	if (canChoose) {
		control = (
			<DefaultProjectSelect id={selectId} projects={projects} projectId={projectId} onSave={saveDefaultProject} />
		);
		labelTarget = selectId;
	}

	return (
		<SettingsSection id="projects" title={t('settings.teamGeneral.PROJECTS_SECTION')}>
			<SettingsSurface>
				<SettingsRow
					label={t('settings.teamGeneral.DEFAULT_PROJECT_LABEL')}
					description={t('settings.teamGeneral.DEFAULT_PROJECT_DESCRIPTION')}
					htmlFor={labelTarget}
				>
					{control}
				</SettingsRow>
			</SettingsSurface>
		</SettingsSection>
	);
}
