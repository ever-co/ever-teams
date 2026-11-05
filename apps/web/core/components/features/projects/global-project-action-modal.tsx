'use client';

import { useAtom } from 'jotai';
import { useCallback, useState } from 'react';
import { projectActionModalState, type ProjectActionType } from '@/core/stores/project-action-modal';
import { DeleteProjectConfirmModal } from './delete-project-modal';
import { EditProjectModal } from './edit-project-modal';
import { ArchiveProjectModal } from './archive-project-modal';
import { RestoreProjectModal } from './restore-project-modal';
import { ViewProjectInfoModal } from './view-project-info-modal';

interface OpenedAction {
	action: ProjectActionType;
	projectId: string;
}

function isSameAction(left: OpenedAction | null, right: OpenedAction) {
	if (!left) {
		return false;
	}
	const isSameKind = left.action === right.action;
	const isSameProject = left.projectId === right.projectId;
	return isSameKind && isSameProject;
}

/**
 * Global instance of the project action dialogs (edit, archive, delete, restore, view info), rendered once at the
 * root so N project rows never mount N dialogs ("Maximum update depth exceeded" before). The last action stays
 * mounted after it closes, so its dialog plays its closing transition.
 */
export function GlobalProjectActionModal() {
	const [modalState, setModalState] = useAtom(projectActionModalState);
	const [lastAction, setLastAction] = useState<OpenedAction | null>(null);

	if (modalState.isOpen) {
		const openedAction = { action: modalState.action, projectId: modalState.projectId };
		if (!isSameAction(lastAction, openedAction)) {
			setLastAction(openedAction);
		}
	}

	const closeModal = useCallback(() => {
		setModalState({ isOpen: false });
	}, [setModalState]);

	if (!lastAction) {
		return null;
	}

	const isOpen = modalState.isOpen;
	const { action, projectId } = lastAction;

	return (
		<>
			{action === 'delete' && (
				<DeleteProjectConfirmModal
					key={projectId}
					projectId={projectId}
					open={isOpen}
					closeModal={closeModal}
				/>
			)}
			{action === 'edit' && (
				<EditProjectModal key={projectId} projectId={projectId} open={isOpen} closeModal={closeModal} />
			)}
			{action === 'archive' && (
				<ArchiveProjectModal key={projectId} projectId={projectId} open={isOpen} closeModal={closeModal} />
			)}
			{action === 'restore' && (
				<RestoreProjectModal key={projectId} projectId={projectId} open={isOpen} closeModal={closeModal} />
			)}
			{action === 'view-info' && (
				<ViewProjectInfoModal key={projectId} projectId={projectId} open={isOpen} closeModal={closeModal} />
			)}
		</>
	);
}
