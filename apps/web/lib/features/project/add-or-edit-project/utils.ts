import { TModalMode } from '.';
import { TStepData } from './container';

/**
 * Retrieves the initial value for a given key based on the current mode and data.
 * If in "edit" mode and the key exists in `currentData`, it returns the corresponding value.
 * Converts `startDate` and `endDate` to Date objects.
 * Falls back to the provided `fallback` value if conditions are not met.
 *
 * @param {TStepData} currentData - The current step data object.
 * @param {TModalMode} mode - The mode of the modal (e.g., "edit").
 * @param {keyof TStepData} key - The key to retrieve from `currentData`.
 * @param {any} fallback - The fallback value if no valid value is found.
 * @returns {any} The processed initial value.
 */
export const getInitialValue = (currentData: TStepData, mode: TModalMode, key: keyof TStepData, fallback: any) => {
	if (mode === 'edit' && currentData?.[key] !== undefined) {
		switch (key) {
			case 'startDate':
			case 'endDate':
				return currentData[key] ? new Date(currentData[key] ?? 0) : fallback;
			default:
				return currentData[key] || fallback;
		}
	}
	return fallback;
};
