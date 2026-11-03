'use client';

import { useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Button } from '@/core/components/duplicated-components/_button';
import { Alert, Archive, Trash } from '@/core/components/icons';
import { ProjectConfirmDialog, ProjectSummaryCard } from '@/core/components/projects/dialogs/project-confirm-dialog';
import { useDeleteOrganizationProject } from '@/core/hooks/organizations/projects/use-delete-organization-project';
import { useOrganizationProjectsQuery } from '@/core/hooks/organizations/projects/use-organization-projects-query';
import { useProjectActionModal } from '@/core/hooks/use-project-action-modal';

interface IDeleteProjectModalProps {
	open: boolean;
	closeModal: () => void;
	projectId: string;
}

export function DeleteProjectConfirmModal({ open, closeModal, projectId }: Readonly<IDeleteProjectModalProps>) {
	const t = useTranslations();
	const { organizationProjects } = useOrganizationProjectsQuery();
	const { deleteOrganizationProject, deleteOrganizationProjectLoading } = useDeleteOrganizationProject();
	const { openArchiveModal } = useProjectActionModal();
	const project = useMemo(
		() => organizationProjects.find((item) => item.id === projectId),
		[organizationProjects, projectId]
	);
	const canArchiveInstead = Boolean(project) && !project?.isArchived;

	const showDeleted = useCallback(
		(projectName: string | null | undefined) => {
			if (projectName) {
				toast.success(t('toasts.projects.DELETED', { name: projectName }), { duration: 4000 });
				return;
			}
			toast.success(t('toasts.projects.DELETED_UNNAMED'), { duration: 4000 });
		},
		[t]
	);

	const handleDelete = useCallback(async () => {
		const projectName = project?.name;
		// useDeleteOrganizationProject swallows the error: the global mutation fallback reports a failed delete
		const isDeleted = await deleteOrganizationProject(projectId);
		if (!isDeleted) {
			return;
		}
		closeModal();
		showDeleted(projectName);
	}, [closeModal, deleteOrganizationProject, project?.name, projectId, showDeleted]);

	let title = t('pages.projects.deleteModal.title');
	if (project?.name) {
		title = t('pages.projects.modals.delete.title', { name: project.name });
	}

	const consequences = [
		{ key: 'gone', icon: <Trash />, text: t('pages.projects.modals.delete.removes'), tone: 'danger' as const },
		{ key: 'final', icon: <Alert />, text: t('pages.projects.modals.delete.final'), tone: 'danger' as const }
	];

	return (
		<ProjectConfirmDialog
			open={open}
			onClose={closeModal}
			tone="danger"
			icon={<Trash />}
			title={title}
			subject={project && <ProjectSummaryCard project={project} />}
			consequences={consequences}
			extra={
				canArchiveInstead && (
					<p className="flex flex-wrap items-center gap-x-1 text-xs text-muted-foreground">
						{t('pages.projects.modals.delete.archiveHint')}
						<Button
							type="button"
							variant="link"
							size="sm"
							onClick={() => openArchiveModal(projectId)}
							className="h-auto px-0 text-xs"
						>
							<Archive aria-hidden="true" className="size-3.5" />
							{t('pages.projects.modals.delete.archiveInstead')}
						</Button>
					</p>
				)
			}
			confirmLabel={t('pages.projects.modals.delete.confirm')}
			isPending={deleteOrganizationProjectLoading}
			onConfirm={handleDelete}
		/>
	);
}
