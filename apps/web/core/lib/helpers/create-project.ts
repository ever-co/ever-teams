import { TStepData } from '@/core/components/features/projects/add-or-edit-project/container';

/**
 * Retrieves the initial value for the project steps form.
 * If the key exists in `currentData`, it returns the corresponding value.
 * Converts `startDate` and `endDate` to Date objects.
 * Falls back to the provided `fallback` value if conditions are not met.
 *
 * @param {TStepData | undefined} currentData - The current step data object.
 * @param {keyof TStepData} key - The key to retrieve from `currentData`.
 * @param {any} fallback - The fallback value if no valid value is found.
 * @returns {any} The processed initial value.
 */
export const getInitialValue = (currentData: TStepData | undefined, key: keyof TStepData, fallback: any) => {
	if (currentData?.[key] !== undefined) {
		switch (key) {
			case 'startDate':
			case 'endDate':
				return currentData[key] ? new Date(currentData[key] ?? 0) : fallback;
			case 'tags':
				return currentData[key]?.map((tag) => tag.id) || [];
			default:
				return currentData[key] || fallback;
		}
	}
	return fallback;
};
