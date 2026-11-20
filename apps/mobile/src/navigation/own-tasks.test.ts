import { ownTasksUserIdOf } from './own-tasks';
import type { OT_Member } from '../../app/services/interfaces/IOrganizationTeam';
import type { IUser } from '../../app/services/interfaces/IUserData';

const kofi = { id: 'user-kofi' } as IUser;
const kofiInFieldCrew = { id: 'member-kofi', employee: { userId: 'user-kofi' } } as unknown as OT_Member;

describe("the id of the person's own Tasks tab", () => {
	it("is the person's user id, never the id of their membership in the team", () => {
		expect(ownTasksUserIdOf(kofiInFieldCrew, kofi)).toBe('user-kofi');
	});

	it('is the person signed in outside a team', () => {
		expect(ownTasksUserIdOf(undefined, kofi)).toBe('user-kofi');
	});

	it('names no one before the person is known', () => {
		expect(ownTasksUserIdOf(undefined, undefined)).toBeUndefined();
	});
});
