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
 * Split the name entered at sign-up into Gauzy's first and last name: the first word, then the rest
 * (same split as the Ever ID sign-up), so "Mary Jane Watson" keeps "Jane Watson" as the last name and
 * extra spaces never yield empty names.
 *
 * @example
 * splitFullName('Mary Jane Watson') // { firstName: 'Mary', lastName: 'Jane Watson' }
 * splitFullName('Cher') // { firstName: 'Cher', lastName: '' }
 */
export function splitFullName(fullName: string): { firstName: string; lastName: string } {
	const [firstName = '', ...lastNames] = fullName.trim().split(/\s+/);
	return { firstName, lastName: lastNames.join(' ') };
}
