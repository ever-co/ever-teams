import type { TOrganizationTeamEmployee } from '@/core/types/schemas';
import { memberEmailOf, memberIsPlaceholderOf } from './settings-team';

function teamMember(employee: Record<string, unknown> | null): TOrganizationTeamEmployee {
	return { employee } as TOrganizationTeamEmployee;
}

describe('settings-team members without an account', () => {
	it('reads the email of the account, or the one given to a member without an account', () => {
		expect(memberEmailOf(teamMember({ user: { email: 'ada@ever.co' } }))).toBe('ada@ever.co');
		expect(
			memberEmailOf(
				teamMember({ isPlaceholder: true, placeholderEmail: 'amina@acme.com', user: { email: null } })
			)
		).toBe('amina@acme.com');
		expect(memberEmailOf(teamMember({ isPlaceholder: true, placeholderEmail: null, user: null }))).toBe('');
		expect(memberEmailOf(teamMember(null))).toBe('');
	});

	it('tells a member without an account from one with an account', () => {
		expect(memberIsPlaceholderOf(teamMember({ isPlaceholder: true }))).toBe(true);
		expect(memberIsPlaceholderOf(teamMember({ isPlaceholder: false }))).toBe(false);
		expect(memberIsPlaceholderOf(teamMember({}))).toBe(false);
		expect(memberIsPlaceholderOf(teamMember(null))).toBe(false);
	});
});
