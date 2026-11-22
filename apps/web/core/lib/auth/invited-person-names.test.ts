/**
 * The names of an account opened from an invitation code typed on the sign-in page (proxy mode). An invitation sent
 * from the Invite dialog carries no name; an account opened without one could not load its workspace.
 */
import { invitedPersonNames } from './invited-person-names';

describe('invitedPersonNames', () => {
	it('takes the start of the address when the invitation carries no name', () => {
		expect(invitedPersonNames(null, 'lea.moreau@example.com')).toEqual({ firstName: 'lea.moreau', lastName: '' });
		expect(invitedPersonNames(undefined, 'lea.moreau@example.com')).toEqual({
			firstName: 'lea.moreau',
			lastName: ''
		});
		expect(invitedPersonNames('  ', 'lea.moreau@example.com')).toEqual({ firstName: 'lea.moreau', lastName: '' });
	});

	it('keeps the split of an invitation that carries a name', () => {
		expect(invitedPersonNames('Lea Moreau', 'lea.moreau@example.com')).toEqual({
			firstName: 'Lea',
			lastName: 'Moreau'
		});
		expect(invitedPersonNames('Cher', 'cher@example.com')).toEqual({ firstName: 'Cher', lastName: '' });
	});
});
