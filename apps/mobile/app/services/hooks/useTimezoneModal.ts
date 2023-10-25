import React, { useCallback, useState } from 'react';

export function useTimezoneModal() {
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [selectedTimezone, setSelectedTimezone] = useState('');

	const openModal = useCallback(() => {
		setIsModalOpen(true);
	}, []);

	const closeModal = useCallback(() => {
		setIsModalOpen(false);
	}, []);

	return {
		isModalOpen,
		openModal,
		closeModal,
		selectedTimezone,
		setSelectedTimezone
	};
}
