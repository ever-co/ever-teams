import { ITagCreate } from '@/core/types/interfaces/tag/tag';
import { generateDefaultColor } from './colors';

/**
 * Intelligently merges label data with defaults and existing values
 */
export function mergeTaskLabelData(
	inputData: Partial<ITagCreate>,
	existingLabel?: any,
	organizationId?: string | null,
	tenantId?: string | null,
	teamId?: string | null
): ITagCreate {
	// Helper to clean string values (null, undefined, empty -> undefined)
	const cleanString = (value: string | null | undefined): string | undefined => {
		if (!value || typeof value !== 'string') return undefined;
		const trimmed = value.trim();
		return trimmed.length > 0 ? trimmed : undefined;
	};

	// Clean and prepare the data
	const cleanData: ITagCreate = {
		// Required fields
		name: cleanString(inputData.name) || cleanString(existingLabel?.name) || '',

		// Smart color handling - always provide a color
		color:
			cleanString(inputData.color) ||
			cleanString(existingLabel?.color) ||
			generateDefaultColor(cleanString(inputData.name) || cleanString(existingLabel?.name) || ''),

		// Smart icon handling
		icon: cleanString(inputData.icon) || cleanString(existingLabel?.icon),

		// Optional fields with fallbacks
		description: cleanString(inputData.description) || cleanString(existingLabel?.description),

		// System fields
		organizationId: inputData.organizationId || organizationId || undefined,
		tenantId: inputData.tenantId || tenantId || undefined,
		organizationTeamId: inputData.organizationTeamId || teamId || undefined
	};

	// Remove undefined values to avoid backend issues
	Object.keys(cleanData).forEach((key) => {
		if (cleanData[key as keyof ITagCreate] === undefined) {
			delete cleanData[key as keyof ITagCreate];
		}
	});

	return cleanData;
}
