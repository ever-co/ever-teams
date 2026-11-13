import {
	activeSettingsEntry,
	entriesOfGroup,
	isSettingsPath,
	SETTINGS_GROUPS,
	TIME_IMPORT_SETTINGS_PATH
} from './settings-entries';

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

function teamEntryIds(canManageTeam: boolean) {
	const entries = entriesOfGroup('team', canManageTeam);
	return entries.map((entry) => entry.id);
}

describe('the Import page in the settings navigation', () => {
	it('is offered to a member who does not manage the team, since they may add their own time', () => {
		expect(teamEntryIds(false)).toEqual(['teamGeneral', 'import']);
	});

	it('follows Integrations for a manager', () => {
		expect(teamEntryIds(true)).toEqual(['teamGeneral', 'members', 'integrations', 'import', 'automations', 'permissions']);
	});

	it('is the active entry on its own address, not the team page above it', () => {
		expect(activeSettingsEntry(TIME_IMPORT_SETTINGS_PATH)?.id).toBe('import');
		expect(activeSettingsEntry('/settings/team')?.id).toBe('teamGeneral');
	});
});
