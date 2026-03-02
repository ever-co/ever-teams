export function generateRandomString(length: number): string {
	const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	let result = '';

	for (let i = 0; i < length; i++) {
		const randomIndex = Math.floor(Math.random() * characters.length);
		result += characters.charAt(randomIndex);
	}

	return result;
}
/**
 * Get a display name for a user or employee with fallback options.
 * Priority:
 * 1. fullName
 * 2. employee.fullName
 * 3. firstName + lastName
 * 4. user.firstName + user.lastName
 * 5. employee.user.firstName + employee.user.lastName
 * 6. fallback
 *
 * @param entity - Object containing name fields (user, employee, or member)
 * @param fallback - Default value if no name is available (default: 'Unknown')
 * @returns Display name string
 *
 * @example
 * // For a user object
 * getUserDisplayName({ fullName: 'John Doe' }) // 'John Doe'
 *
 * // For an object with firstName/lastName
 * getUserDisplayName({ firstName: 'John', lastName: 'Doe' }) // 'John Doe'
 *
 * // For nested user object (employee/member)
 * getUserDisplayName({ user: { firstName: 'John', lastName: 'Doe' } }) // 'John Doe'
 */
export function getUserDisplayName(
	entity?: {
		fullName?: string | null;
		firstName?: string | null;
		lastName?: string | null;
		user?: {
			firstName?: string | null;
			lastName?: string | null;
		} | null;
		employee?: {
			fullName?: string | null;
			user?: {
				firstName?: string | null;
				lastName?: string | null;
			} | null;
		} | null;
	} | null,
	fallback = 'Unknown'
): string {
	if (!entity) return fallback;

	// Direct fullName
	if (entity.fullName?.trim()) {
		return entity.fullName.trim();
	}

	// Nested employee fullName
	if (entity.employee?.fullName?.trim()) {
		return entity.employee.fullName.trim();
	}

	// Direct firstName/lastName
	const directName = [entity.firstName, entity.lastName].filter(Boolean).join(' ').trim();
	if (directName) {
		return directName;
	}

	// Nested user firstName/lastName
	const userName = [entity.user?.firstName, entity.user?.lastName].filter(Boolean).join(' ').trim();
	if (userName) {
		return userName;
	}

	// Nested employee.user firstName/lastName
	const employeeUserName = [entity.employee?.user?.firstName, entity.employee?.user?.lastName]
		.filter(Boolean)
		.join(' ')
		.trim();
	if (employeeUserName) {
		return employeeUserName;
	}

	return fallback;
}
