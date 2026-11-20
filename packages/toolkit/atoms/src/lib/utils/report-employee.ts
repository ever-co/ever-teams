import type { IUser } from '@ever-teams/toolkit-types';

/**
 * The employee a report reads: the one picked in "Select employee", else the signed-in person's own. "all" (the
 * default, and all a person who cannot pick has) reads the person's own, as before (#5631).
 */
export function reportEmployeeIdOf(user: IUser, selectedEmployee: string): string | undefined {
	if (selectedEmployee !== 'all') {
		return selectedEmployee;
	}
	return user.employee?.id;
}
