'use client';

import { useProjectPermissions } from '@/core/hooks/projects/use-project-permissions';
import type { ProjectTaskStatsState } from '@/core/hooks/projects/use-project-task-stats';
import type { TOrganizationProject } from '@/core/types/schemas';
import type { TTaskStatus } from '@/core/types/schemas/task/task-status.schema';
import { ProjectFacts, ProjectLinks, ProjectProperties } from '@/core/components/projects/project-properties';
import { EntityFilesSection } from '@/core/components/common/entity-files/entity-files-section';
import { ProjectDescription } from './project-description';
import { ProjectProgressPanel } from './project-progress-panel';

export function ProjectOverview({
	project,
	statuses,
	taskStats
}: Readonly<{ project: TOrganizationProject; statuses: TTaskStatus[]; taskStats: ProjectTaskStatsState }>) {
	const { canEdit } = useProjectPermissions({ members: project.members });
	const canEditContent = canEdit && !project.isArchived;
	return (
		<div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] xl:gap-10">
			<div className="flex min-w-0 flex-col gap-8">
				<ProjectProperties project={project} statuses={statuses} />
				<ProjectLinks project={project} />
				<ProjectDescription project={project} canEdit={canEditContent} />
				<EntityFilesSection entity="OrganizationProject" entityId={project.id} canEdit={canEditContent} />
			</div>
			<aside className="flex flex-col self-start rounded-xl bg-card hairline-ring ring-border shadow-sm shadow-black/6.5 hairline-divide-y divide-border">
				<ProjectProgressPanel projectId={project.id} taskStats={taskStats} statuses={statuses} />
				<ProjectFacts project={project} />
			</aside>
		</div>
	);
}
