'use client';

import { useCallback, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { CircleCheck, RotateLeft, UsersGroup } from '@/core/components/icons';
import { ProjectConfirmDialog, ProjectSummaryCard } from '@/core/components/projects/dialogs/project-confirm-dialog';
import { useEditOrganizationProject } from '@/core/hooks/organizations/projects/use-edit-organization-project';
import { useOrganizationProjectsQuery } from '@/core/hooks/organizations/projects/use-organization-projects-query';

interface IRestoreProjectModalProps {
	open: boolean;
	closeModal: () => void;
	projectId: string;
}

export function RestoreProjectModal({ open, closeModal, projectId }: IRestoreProjectModalProps) {
	const t = useTranslations();
	const { organizationProjects } = useOrganizationProjectsQuery();
	const { editOrganizationProject, editOrganizationProjectLoading } = useEditOrganizationProject();
	const [hasFailed, setHasFailed] = useState(false);
	const project = useMemo(
		() => organizationProjects.find((item) => item.id === projectId),
		[organizationProjects, projectId]
	);

	const handleRestore = useCallback(async () => {
		setHasFailed(false);
		const res = await editOrganizationProject(projectId, {
			isArchived: false,
			isActive: true,
			archivedAt: null
		});
		if (!res) {
			setHasFailed(true);
			return;
		}
		closeModal();
	}, [closeModal, editOrganizationProject, projectId]);

	const consequences = [
		{ key: 'active', icon: <CircleCheck />, text: t('pages.projects.modals.restore.backToActive') },
		{ key: 'kept', icon: <UsersGroup />, text: t('pages.projects.modals.restore.keepsSettings') }
	];

	let error: string | null = null;
	if (hasFailed) {
		error = t('pages.projects.modals.errors.restore');
	}

	return (
		<ProjectConfirmDialog
			open={open}
			onClose={closeModal}
			icon={<RotateLeft />}
			title={t('pages.projects.modals.restore.title', { name: project?.name ?? '' })}
			subject={project && <ProjectSummaryCard project={project} />}
			consequences={consequences}
			confirmLabel={t('pages.projects.modals.restore.confirm')}
			isPending={editOrganizationProjectLoading}
			error={error}
			onConfirm={handleRestore}
		/>
	);
}
