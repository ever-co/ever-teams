'use client';

import dynamic from 'next/dynamic';
import { ProjectTile } from '@/core/components/projects/project-cells';
import { ProjectDialog } from '@/core/components/projects/dialogs/project-dialog';
import { ProjectComposerSkeleton } from '@/core/components/projects/dialogs/project-dialog-skeletons';
import { useOrganizationProjectsQuery } from '@/core/hooks/organizations/projects/use-organization-projects-query';

const LazyProjectComposer = dynamic(
	() => import('@/core/components/projects/composer/project-composer').then((module) => module.ProjectComposer),
	{ ssr: false, loading: () => <ProjectComposerSkeleton /> }
);

interface IEditProjectModalProps {
	open: boolean;
	closeModal: () => void;
	projectId: string;
}

export function EditProjectModal({ open, closeModal, projectId }: Readonly<IEditProjectModalProps>) {
	const { organizationProjects } = useOrganizationProjectsQuery();
	const project = organizationProjects.find((item) => item.id === projectId);
	const hasProject = Boolean(project);
	const showsComposer = open && hasProject;
	const showsSkeleton = open && !hasProject;

	return (
		<ProjectDialog open={open} onClose={closeModal} width="lg" keepOpenOnOutsideClick>
			{showsComposer && project && (
				<LazyProjectComposer
					key={project.id}
					mode="edit"
					project={project}
					context={
						<>
							<ProjectTile project={project} size="sm" className="size-4 text-[7px]" />
							<span className="truncate">{project.name}</span>
						</>
					}
					onClose={closeModal}
				/>
			)}
			{showsSkeleton && <ProjectComposerSkeleton />}
		</ProjectDialog>
	);
}
