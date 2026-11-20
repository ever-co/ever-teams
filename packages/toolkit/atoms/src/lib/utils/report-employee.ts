import { PermissionsEnum } from '@ever-teams/toolkit-types';
import type { IPermission, IUser } from '@ever-teams/toolkit-types';

/**
 * The employee picked in "Select employee", for a person who may pick one (the permission that shows the picker);
 * "all" for anyone else, whatever the kit's state holds, so that the reads never ask for another employee's data on
 * their behalf (#5631).
 */
export function pickedEmployeeOf(selectedEmployee: string, permissions: IPermission[] | null): string {
	const mayPick = Boolean(
		permissions?.some(({ permission }) => permission === PermissionsEnum.CHANGE_SELECTED_EMPLOYEE)
	);
	return mayPick ? selectedEmployee : 'all';
}

/**
 * The employee a report reads: the one picked (see pickedEmployeeOf), else the signed-in person's own. With "all"
 * picked, it reads the person's own, as before (#5631).
 */
export function reportEmployeeIdOf(user: IUser, selectedEmployee: string): string | undefined {
	if (selectedEmployee !== 'all') {
		return selectedEmployee;
	}
	return user.employee?.id;
}
