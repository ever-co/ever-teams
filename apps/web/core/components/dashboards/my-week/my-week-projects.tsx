'use client';

import { useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { DashboardSection } from '@/core/components/dashboards/kit/dashboard-layout';
import { ShareBar, ShareRows } from '@/core/components/dashboards/kit/share-rows';
import { ProjectMark } from '@/core/components/dashboards/team/team-marks';
import { cn } from '@/core/lib/helpers';
import { formatDurationShort, shareRowsOf } from '@/core/lib/utils/dashboard-figures';
import { namedProjectCountOf } from '@/core/lib/utils/dashboards/my-week';
import type { ProjectShareItem } from '@/core/lib/utils/dashboards/team';

/** The projects named before the rest is gathered in one "N other projects" row, so the rows still add up. */
const LEADING_PROJECTS = 5;

function projectSecondsOf(project: ProjectShareItem) {
	return project.seconds;
}

function projectKeyOf(project: ProjectShareItem) {
	return project.key;
}

function ProjectName({ project }: Readonly<{ project: ProjectShareItem }>) {
	const t = useTranslations();
	const name = project.name ?? t('dashboard.timesheets.NO_PROJECT');
	return (
		<>
			<ProjectMark imageUrl={project.imageUrl} color={project.color} isNoProject={project.isNoProject} />
			<span className={cn('truncate', project.isNoProject && 'text-muted-foreground')}>{name}</span>
		</>
	);
}

function renderProjectName(project: ProjectShareItem) {
	return <ProjectName project={project} />;
}

export function MyWeekProjects({ projects }: Readonly<{ projects: ReadonlyArray<ProjectShareItem> }>) {
	const t = useTranslations();
	const rows = useMemo(() => shareRowsOf(projects, projectSecondsOf, projectKeyOf, LEADING_PROJECTS), [projects]);
	const otherLabel = useCallback((count: number) => t('dashboard.team.projects.OTHER', { count }), [t]);
	const title = t('dashboard.myWeek.PROJECTS_TITLE');
	const namedCount = namedProjectCountOf(projects);
	let meta: string | undefined;
	if (namedCount > 0) {
		meta = t('dashboard.team.projects.COUNT', { count: namedCount });
	}
	return (
		<DashboardSection title={title} meta={meta} ariaLabel={title} bodyClassName="pb-2">
			<div className="px-4 pt-1 pb-2">
				<ShareBar rows={rows} />
			</div>
			<ShareRows
				rows={rows}
				renderName={renderProjectName}
				formatValue={formatDurationShort}
				otherLabel={otherLabel}
				density="narrow"
			/>
		</DashboardSection>
	);
}
