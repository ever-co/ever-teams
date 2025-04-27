/* -------------------------------------------------------------------------- */
/*                             ID Management Utilities                        */
/* -------------------------------------------------------------------------- */

/**
 * Extract all `id` values from an array of objects.
 *
 * @param items - Array of objects containing an `id` field.
 * @returns Array of ID strings.
 *
 * @example
 * extractIds([{ id: "1" }, { id: "2" }]) => ["1", "2"]
 */
export const extractIdsFromItems = <T extends { id: string }>(items: T[]): string[] => {
	return items.map((item) => item.id);
};

/**
 * Check whether a specific ID exists within a list of valid IDs.
 *
 * @param id - ID to validate.
 * @param validIds - Array of valid ID strings.
 * @returns True if ID is valid, otherwise false.
 *
 * @example
 * isValidId("abc", ["abc", "def"]) => true
 */
export const isValidIdInList = (id: string | null | undefined, validIds: string[]): boolean => {
	return !!id && validIds.includes(id);
};

/**
 * Filter a list of IDs to retain only those present in a valid IDs list.
 *
 * @param ids - Array of IDs to check.
 * @param validIds - Array of valid IDs.
 * @returns Array of valid IDs.
 *
 * @example
 * filterValidIds(["1", "2", "3"], ["2", "3"]) => ["2", "3"]
 */
export const filterValidIds = (ids: string[], validIds: string[]): string[] => {
	return ids.filter((id) => validIds.includes(id));
};

/**
 * Partition a list of IDs into valid and invalid based on a valid IDs list.
 *
 * @param ids - Array of IDs to partition.
 * @param validIds - Array of valid IDs.
 * @returns An object containing arrays of valid and invalid IDs.
 *
 * @example
 * partitionIds(["1", "2"], ["2", "3"]) => { valid: ["2"], invalid: ["1"] }
 */
export const partitionIdsByValidity = (ids: string[], validIds: string[]): { valid: string[]; invalid: string[] } => {
	const valid: string[] = [];
	const invalid: string[] = [];

	ids.forEach((id) => {
		if (validIds.includes(id)) {
			valid.push(id);
		} else {
			invalid.push(id);
		}
	});

	return { valid, invalid };
};

export const isObject = (value: unknown): value is Record<string, unknown> => {
	return typeof value === "object" && value !== null;
};
