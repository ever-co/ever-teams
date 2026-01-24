/**
 * Formats a user's full name from first and last name properties.
 *
 * @param user - User object containing firstName and lastName properties
 * @returns Formatted full name string, trimmed and with empty string fallback
 *
 * @example
 * ```ts
 * formatUserFullName({ firstName: 'John', lastName: 'Doe' })
 * // Returns: "John Doe"
 *
 * formatUserFullName({ firstName: 'Jane', lastName: null })
 * // Returns: "Jane"
 *
 * formatUserFullName({ firstName: null, lastName: null })
 * // Returns: ""
 * ```
 */
export function formatUserFullName(user?: { firstName?: string | null; lastName?: string | null } | null): string {
	if (!user) return '';

	const firstName = user.firstName || '';
	const lastName = user.lastName || '';

	return `${firstName} ${lastName}`.trim();
}
