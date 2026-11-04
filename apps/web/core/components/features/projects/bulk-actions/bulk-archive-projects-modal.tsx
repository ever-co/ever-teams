'use client';

import { useCallback } from 'react';
import { useTranslations } from 'next-intl';
import moment from 'moment';
import { Archive, RotateLeft } from '@/core/components/icons';
import { ProjectConfirmDialog, ProjectListCard } from '@/core/components/projects/dialogs/project-confirm-dialog';
import { useBulkProjectUpdate } from '@/core/hooks/projects/use-bulk-project-update';

interface IBulkArchiveProjectModalProps {
	open: boolean;
	closeModal: () => void;
	projectIds: string[];
}

export function BulkArchiveProjectsModal({
	open,
	closeModal,
	projectIds = []
}: Readonly<IBulkArchiveProjectModalProps>) {
	const t = useTranslations();
	const { projects, updateAll, isUpdating, hasFailed } = useBulkProjectUpdate(projectIds);
	const count = projects.length;

	const handleBulkArchive = useCallback(async () => {
		const archivedAt = moment(Date.now()).format();
		const isDone = await updateAll({ isArchived: true, isActive: false, archivedAt });
		if (isDone) {
			closeModal();
		}
	}, [closeModal, updateAll]);

	let error: string | null = null;
	if (hasFailed) {
		error = t('pages.projects.modals.errors.bulkArchive');
	}

	return (
		<ProjectConfirmDialog
			open={open}
			onClose={closeModal}
			icon={<Archive />}
			title={t('pages.projects.modals.bulk.archiveTitle', { count })}
			description={t('pages.projects.modals.bulk.archiveDescription', { count })}
			subject={<ProjectListCard projects={projects} label={t('pages.projects.modals.bulk.selected')} />}
			consequences={[
				{ key: 'restore', icon: <RotateLeft />, text: t('pages.projects.modals.bulk.restorable', { count }) }
			]}
			confirmLabel={t('pages.projects.modals.bulk.archiveConfirm', { count })}
			isPending={isUpdating}
			error={error}
			onConfirm={handleBulkArchive}
		/>
	);
}
