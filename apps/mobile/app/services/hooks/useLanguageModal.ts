import React, { useCallback, useState } from 'react';
import { ILanguageItemList } from '../interfaces/IUserData';

export function useLanguageModal() {
	const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false);
	const [selectedLanguage, setSelectedLanguage] = useState<ILanguageItemList>();

	const openLanguageModal = useCallback(() => {
		setIsLanguageModalOpen(true);
	}, []);

	const closeLanguageModal = useCallback(() => {
		setIsLanguageModalOpen(false);
	}, []);

	return {
		isLanguageModalOpen,
		openLanguageModal,
		closeLanguageModal,
		selectedLanguage,
		setSelectedLanguage
	};
}
