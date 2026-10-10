import { TStepData } from '@/core/components/features/projects/add-or-edit-project/container';
import { TRole } from '@/core/types/schemas';

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

const FALLBACK_ROLE_ID_PREFIX = 'fallback-';

/**
 * Project member role ids are `fallback-<ROLE NAME>` until the roles list loads, and the list can load after a
 * member was assigned. Reads such an id as the loaded role with the same name and leaves any other id unchanged.
 */
export const resolveProjectRoleId = (roleId: string, roles: TRole[]): string => {
	if (!roleId?.startsWith(FALLBACK_ROLE_ID_PREFIX)) return roleId;
	const name = roleId.slice(FALLBACK_ROLE_ID_PREFIX.length);
	return roles.find((role) => role.name === name)?.id ?? roleId;
};
