import { useCallback, useState } from 'react';

export function useModal() {
	const [isOpen, setIsOpen] = useState(false);
	const closeModal = useCallback(() => {
		setIsOpen(false);
	}, []);

	const openModal = useCallback(() => {
		setIsOpen(true);
	}, []);

	return {
		isOpen,
		closeModal,
		openModal,
	};
}

export type IHookModal = ReturnType<typeof useModal>;
