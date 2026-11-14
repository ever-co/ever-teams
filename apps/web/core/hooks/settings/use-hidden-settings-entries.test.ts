jest.mock('@/core/hooks/task-automations/use-task-automations', () => ({ useTaskAutomationsAvailability: jest.fn() }));
jest.mock('@/core/hooks/auth/use-two-factor-settings', () => ({ useTwoFactorStatus: jest.fn() }));

import { entriesOfGroup } from '@/core/components/settings/kit/settings-entries';
import { showsAutomationsEntry, showsSecurityEntry } from './use-hidden-settings-entries';

describe('the Automations settings entry', () => {
	it('shows only while the platform says it has the automations', () => {
		expect(showsAutomationsEntry('available')).toBe(true);
		// A person the platform refuses still finds the page, which tells them why.
		expect(showsAutomationsEntry('forbidden')).toBe(true);
		expect(showsAutomationsEntry('error')).toBe(true);
		expect(showsAutomationsEntry('off')).toBe(false);
		expect(showsAutomationsEntry('unavailable')).toBe(false);
		expect(showsAutomationsEntry('loading')).toBe(false);
	});

	it('is a manager’s Team entry, left out when hidden', () => {
		const ids = (canManage: boolean, hidden?: ReadonlySet<'automations'>) =>
			entriesOfGroup('team', canManage, hidden).map((entry) => entry.id);
		expect(ids(true)).toContain('automations');
		expect(ids(false)).not.toContain('automations');
		expect(ids(true, new Set(['automations']))).not.toContain('automations');
		expect(ids(true, new Set(['automations']))).toContain('integrations');
	});
});

describe('the Security settings entry', () => {
	it('shows once the platform answers the two-factor state, never on an API without it', () => {
		expect(showsSecurityEntry('ready')).toBe(true);
		expect(showsSecurityEntry('error')).toBe(true);
		expect(showsSecurityEntry('unsupported')).toBe(false);
		expect(showsSecurityEntry('loading')).toBe(false);
	});

	it('is an Account entry for everyone, left out when hidden', () => {
		const ids = (hidden?: ReadonlySet<'security'>) =>
			entriesOfGroup('account', false, hidden).map((entry) => entry.id);
		expect(ids()).toContain('security');
		expect(ids(new Set(['security']))).not.toContain('security');
		expect(ids(new Set(['security']))).toContain('notifications');
	});
});
