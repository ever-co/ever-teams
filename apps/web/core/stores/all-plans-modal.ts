import { atom } from 'jotai';

/**
 * Global state for AllPlansModal
 * This ensures only ONE instance of the modal is rendered globally
 */
export interface IAllPlansModalState {
	isOpen: boolean;
	employeeId: string | null;
}

export const allPlansModalState = atom<IAllPlansModalState>({
	isOpen: false,
	employeeId: null
});

