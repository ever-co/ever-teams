import { useSetAtom } from 'jotai';
import { useCallback } from 'react';
import { projectActionModalState, ProjectActionType } from '@/core/stores/project-action-modal';

/**
 * Hook to control the global ProjectActionModal
 *
 * Provides a clean API to open/close the modal without needing to know
 * the internal state structure.
 *
 * @example
 * ```tsx
 * const { openEditModal, openArchiveModal, openDeleteModal, closeModal } = useProjectActionModal();
 *
 * // In your click handlers:
 * <button onClick={() => openEditModal(projectId)}>Edit</button>
 * <button onClick={() => openArchiveModal(projectId)}>Archive</button>
 * <button onClick={() => openDeleteModal(projectId)}>Delete</button>
 * ```
 */
export function useProjectActionModal() {
	const setModalState = useSetAtom(projectActionModalState);

	const openModal = useCallback(
		(action: ProjectActionType, projectId: string) => {
			setModalState({ isOpen: true, action, projectId });
		},
		[setModalState]
	);

	const openEditModal = useCallback(
		(projectId: string) => {
			openModal('edit', projectId);
		},
		[openModal]
	);

	const openArchiveModal = useCallback(
		(projectId: string) => {
			openModal('archive', projectId);
		},
		[openModal]
	);

	const openDeleteModal = useCallback(
		(projectId: string) => {
			openModal('delete', projectId);
		},
		[openModal]
	);

	const openRestoreModal = useCallback(
		(projectId: string) => {
			openModal('restore', projectId);
		},
		[openModal]
	);

	const closeModal = useCallback(() => {
		setModalState({ isOpen: false });
	}, [setModalState]);

	return {
		openEditModal,
		openArchiveModal,
		openDeleteModal,
		openRestoreModal,
		closeModal
	};
}
