import { atom } from 'jotai';

/**
 * Project action types for the global modal
 */
export type ProjectActionType = 'edit' | 'archive' | 'delete' | 'restore';

/**
 * Discriminated union state for ProjectActionModal
 * This ensures type safety - you can't have isOpen: true without projectId and action
 */
export type ProjectActionModalState =
	| { isOpen: false }
	| { isOpen: true; action: ProjectActionType; projectId: string };

/**
 * Global state for ProjectActionModal
 * This ensures only ONE instance of the modal is rendered globally,
 * preventing the "Maximum update depth exceeded" error caused by
 * rendering N modals for N project items.
 *
 * Usage:
 * ```tsx
 * import { useSetAtom } from 'jotai';
 * import { projectActionModalState } from '@/core/stores/project-action-modal';
 *
 * const setProjectActionModal = useSetAtom(projectActionModalState);
 *
 * // Open edit modal
 * setProjectActionModal({ isOpen: true, action: 'edit', projectId: 'xxx' });
 *
 * // Open archive modal
 * setProjectActionModal({ isOpen: true, action: 'archive', projectId: 'xxx' });
 *
 * // Open delete modal
 * setProjectActionModal({ isOpen: true, action: 'delete', projectId: 'xxx' });
 *
 * // Close modal
 * setProjectActionModal({ isOpen: false });
 * ```
 */
export const projectActionModalState = atom<ProjectActionModalState>({
	isOpen: false
});
