import { useState } from 'react';
import { SECTION_IDS } from './data/section-config';

export const useSectionState = () => {
	// Load saved section state from localStorage
	const loadSectionState = (sectionId: string, defaultValue: boolean = true) => {
		if (typeof window === 'undefined') return defaultValue;
		const saved = localStorage.getItem(`craft-panel-${sectionId}`);
		return saved !== null ? JSON.parse(saved) : defaultValue;
	};

	// Initialize section states
	const [sectionStates, setSectionStates] = useState({
		[SECTION_IDS.TIMER]: loadSectionState(SECTION_IDS.TIMER),
		[SECTION_IDS.CHART]: loadSectionState(SECTION_IDS.CHART),
		[SECTION_IDS.DATE]: loadSectionState(SECTION_IDS.DATE),
		[SECTION_IDS.TYPOGRAPHY]: loadSectionState(SECTION_IDS.TYPOGRAPHY),
		[SECTION_IDS.UI]: loadSectionState(SECTION_IDS.UI),
		[SECTION_IDS.LAYOUT]: loadSectionState(SECTION_IDS.LAYOUT)
	});

	// Toggle section visibility
	const toggleSection = (sectionId: string) => {
		setSectionStates((prev) => {
			const newState = { ...prev, [sectionId]: !prev[sectionId] };
			localStorage.setItem(`craft-panel-${sectionId}`, JSON.stringify(newState[sectionId]));
			return newState;
		});
	};

	return {
		sectionStates,
		toggleSection
	};
};
