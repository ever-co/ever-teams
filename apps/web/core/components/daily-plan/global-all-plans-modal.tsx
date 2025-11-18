'use client';

import { useAtom } from 'jotai';
import { Suspense, useCallback } from 'react';
import { allPlansModalState } from '@/core/stores/all-plans-modal';
import { AllPlansModal } from './all-plans-modal';
import { ModalSkeleton } from '../common/skeleton/modal-skeleton';

/**
 * Global instance of AllPlansModal
 * This component should be rendered ONCE at a root level component
 * to ensure only one modal instance exists across the entire app.
 *
 * Usage:
 * 1. Import and render <GlobalAllPlansModal /> in your a root level component
 * 2. Use the allPlansModalState atom to open/close the modal from anywhere:
 *
 * ```tsx
 * import { useSetAtom } from 'jotai';
 * import { allPlansModalState } from '@/core/stores/all-plans-modal';
 *
 * const setAllPlansModal = useSetAtom(allPlansModalState);
 *
 * // Open modal for a specific employee
 * setAllPlansModal({ isOpen: true, employeeId: 'employee-id-here' });
 *
 * // Close modal
 * setAllPlansModal({ isOpen: false, employeeId: null });
 * ```
 */
export function GlobalAllPlansModal() {
	const [modalState, setModalState] = useAtom(allPlansModalState);

	const closeModal = useCallback(() => {
		setModalState({ isOpen: false, employeeId: null });
	}, [setModalState]);

	return (
		modalState.isOpen && (
			<Suspense key="global-all-plans-modal" fallback={<ModalSkeleton />}>
				<AllPlansModal isOpen={modalState.isOpen} closeModal={closeModal} employeeId={modalState.employeeId} />
			</Suspense>
		)
	);
}
