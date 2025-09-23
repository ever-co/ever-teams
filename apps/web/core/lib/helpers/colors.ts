import { DEFAULT_LABEL_COLORS } from '@/core/constants/data/mock-data';

export function getTextColor(bgColor: string) {
	if (!bgColor) return '#000';

	const color = bgColor.charAt(0) === '#' ? bgColor.substring(1, 7) : bgColor;
	const r = parseInt(color.substring(0, 2), 16); // hexToR
	const g = parseInt(color.substring(2, 4), 16); // hexToG
	const b = parseInt(color.substring(4, 6), 16); // hexToB
	const uicolors = [r / 255, g / 255, b / 255];
	const c = uicolors.map((col) => {
		if (col <= 0.03928) {
			return col / 12.92;
		}
		return Math.pow((col + 0.055) / 1.055, 2.4);
	});
	const L = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
	return L > 0.179 ? '#000' : '#cdd1d8';
}

/**
 * Generates a consistent color based on label name
 */
export function generateDefaultColor(name: string): string {
	if (!name) return DEFAULT_LABEL_COLORS[DEFAULT_LABEL_COLORS.length - 1];

	// Simple hash function to get consistent color for same name
	let hash = 0;
	for (let i = 0; i < name.length; i++) {
		hash = ((hash << 5) - hash + name.charCodeAt(i)) & 0xffffffff;
	}
	const index = Math.abs(hash) % (DEFAULT_LABEL_COLORS.length - 1);
	return DEFAULT_LABEL_COLORS[index];
}
