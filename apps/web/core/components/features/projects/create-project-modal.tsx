'use client';

import dynamic from 'next/dynamic';
import { EntityTile } from '@/core/components/common/entity-tile';
import { ProjectDialog } from '@/core/components/projects/dialogs/project-dialog';
import { ProjectComposerSkeleton } from '@/core/components/projects/dialogs/project-dialog-skeletons';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';

const LazyProjectComposer = dynamic(
	() => import('@/core/components/projects/composer/project-composer').then((module) => module.ProjectComposer),
	{ ssr: false, loading: () => <ProjectComposerSkeleton /> }
);

interface ICreateProjectModalProps {
	open: boolean;
	closeModal: () => void;
}

function WorkspaceChip() {
	const { data: user } = useUserQuery();
	const workspaceName = user?.tenant?.name;
	if (!workspaceName) {
		return null;
	}
	return (
		<>
			<EntityTile name={workspaceName} imageUrl={user?.tenant?.logo} className="size-4 text-[7px]" />
			<span className="truncate">{workspaceName}</span>
		</>
	);
}

export function CreateProjectModal({ open, closeModal }: Readonly<ICreateProjectModalProps>) {
	return (
		<ProjectDialog open={open} onClose={closeModal} width="lg" keepOpenOnOutsideClick>
			{open && <LazyProjectComposer mode="create" context={<WorkspaceChip />} onClose={closeModal} />}
		</ProjectDialog>
	);
}
