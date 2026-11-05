'use client';

import { useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { CircleCheck, RotateLeft } from '@/core/components/icons';
import { ProjectConfirmDialog, ProjectListCard } from '@/core/components/projects/dialogs/project-confirm-dialog';
import { useBulkProjectUpdate } from '@/core/hooks/projects/use-bulk-project-update';

interface IBulkRestoreProjectModalProps {
	open: boolean;
	closeModal: () => void;
	projectIds: string[];
}

export function BulkRestoreProjectsModal({
	open,
	closeModal,
	projectIds = []
}: Readonly<IBulkRestoreProjectModalProps>) {
	const t = useTranslations();
	const { projects, updateAll, isUpdating, hasFailed } = useBulkProjectUpdate(projectIds);
	const count = projects.length;

	const handleBulkRestore = useCallback(async () => {
		const isDone = await updateAll({ isArchived: false, isActive: true, archivedAt: null });
		if (isDone) {
			closeModal();
		}
	}, [closeModal, updateAll]);

	let error: string | null = null;
	if (hasFailed) {
		error = t('pages.projects.modals.errors.bulkRestore');
	}

	return (
		<ProjectConfirmDialog
			open={open}
			onClose={closeModal}
			icon={<RotateLeft />}
			title={t('pages.projects.modals.bulk.restoreTitle', { count })}
			description={t('pages.projects.modals.bulk.restoreDescription', { count })}
			subject={<ProjectListCard projects={projects} label={t('pages.projects.modals.bulk.selected')} />}
			consequences={[
				{ key: 'kept', icon: <CircleCheck />, text: t('pages.projects.modals.bulk.keepsSettings', { count }) }
			]}
			confirmLabel={t('pages.projects.modals.bulk.restoreConfirm', { count })}
			isPending={isUpdating}
			error={error}
			onConfirm={handleBulkRestore}
		/>
	);
}
