'use client';

import { useAtom } from 'jotai';
import { Suspense, useCallback } from 'react';
import { projectActionModalState } from '@/core/stores/project-action-modal';
import { DeleteProjectConfirmModal } from './delete-project-modal';
import { EditProjectModal } from './edit-project-modal';
import { ArchiveProjectModal } from './archive-project-modal';
import { RestoreProjectModal } from './restore-project-modal';
import { ViewProjectInfoModal } from './view-project-info-modal';
import { ModalSkeleton } from '@/core/components/common/skeleton/modal-skeleton';

/**
 * Global instance of Project Action Modals (Edit, Archive, Delete, Restore)
 *
 * This component should be rendered ONCE at a root level component
 * to ensure only one modal instance exists across the entire app.
 *
 * This pattern fixes the "Maximum update depth exceeded" error caused by
 * rendering N modals for N project items in ProjectItemActions.
 *
 */
export function GlobalProjectActionModal() {
	const [modalState, setModalState] = useAtom(projectActionModalState);

	const closeModal = useCallback(() => {
		setModalState({ isOpen: false });
	}, [setModalState]);

	if (!modalState.isOpen) {
		return null;
	}

	return (
		<Suspense fallback={<ModalSkeleton />}>
			{modalState.action === 'delete' && (
				<DeleteProjectConfirmModal projectId={modalState.projectId} open={true} closeModal={closeModal} />
			)}
			{modalState.action === 'edit' && (
				<EditProjectModal projectId={modalState.projectId} open={true} closeModal={closeModal} />
			)}
			{modalState.action === 'archive' && (
				<ArchiveProjectModal projectId={modalState.projectId} open={true} closeModal={closeModal} />
			)}
			{modalState.action === 'restore' && (
				<RestoreProjectModal projectId={modalState.projectId} open={true} closeModal={closeModal} />
			)}
			{modalState.action === 'view-info' && (
				<ViewProjectInfoModal projectId={modalState.projectId} open={true} closeModal={closeModal} />
			)}
		</Suspense>
	);
}
