import { SETTINGS_GROUPS, activeSettingsEntry, entriesOfGroup, isSettingsPath } from './settings-entries';

describe('the workspace entry of Settings (#5087)', () => {
	it('sits in its own group, between the account and the team', () => {
		expect(SETTINGS_GROUPS).toEqual(['account', 'workspace', 'team', 'taskProperties']);
	});

	it('is listed for every member, who reads the values when they may not change them', () => {
		const forMembers = entriesOfGroup('workspace', false).map((entry) => entry.href);
		const forManagers = entriesOfGroup('workspace', true).map((entry) => entry.href);

		expect(forMembers).toEqual(['/settings/workspace']);
		expect(forManagers).toEqual(['/settings/workspace']);
	});

	it('is the current entry of its page, which shows the settings rail', () => {
		expect(activeSettingsEntry('/settings/workspace')?.id).toBe('workspaceGeneral');
		expect(isSettingsPath('/settings/workspace')).toBe(true);
	});
});
