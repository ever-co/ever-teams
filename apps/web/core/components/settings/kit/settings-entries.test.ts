import { activeSettingsEntry, entriesOfGroup, TIME_IMPORT_SETTINGS_PATH } from './settings-entries';

function teamEntryIds(canManageTeam: boolean) {
	const entries = entriesOfGroup('team', canManageTeam);
	return entries.map((entry) => entry.id);
}

describe('the Import page in the settings navigation', () => {
	it('is offered to a member who does not manage the team, since they may add their own time', () => {
		expect(teamEntryIds(false)).toEqual(['teamGeneral', 'import']);
	});

	it('follows Integrations for a manager', () => {
		expect(teamEntryIds(true)).toEqual([
			'teamGeneral',
			'members',
			'integrations',
			'import',
			'automations',
			'permissions'
		]);
	});

	it('is the active entry on its own address, not the team page above it', () => {
		expect(activeSettingsEntry(TIME_IMPORT_SETTINGS_PATH)?.id).toBe('import');
		expect(activeSettingsEntry('/settings/team')?.id).toBe('teamGeneral');
	});
});
