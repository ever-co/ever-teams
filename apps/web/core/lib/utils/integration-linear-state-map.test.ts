import { effectiveStateMap, invalidStateMapKinds, matchStatusName } from './integration-linear-state-map';

const OPTIONS = [{ name: 'open' }, { name: 'In Progress' }, { name: 'completed' }, { name: 'backlog' }, { name: 'cancelled' }];

describe('integration-linear-state-map', () => {
	it('fills the map from the platform defaults, then the mapping, skipping blanks', () => {
		expect(effectiveStateMap({ started: 'doing', canceled: '' }, { started: 'In Progress', triage: '  ' })).toEqual({
			triage: 'open',
			backlog: 'backlog',
			unstarted: 'open',
			started: 'In Progress',
			completed: 'completed',
			canceled: 'cancelled'
		});
	});

	it('matches a status by name whatever the case or the spaces around it', () => {
		expect(matchStatusName(' in progress ', OPTIONS)).toEqual({ name: 'In Progress' });
		expect(matchStatusName('', OPTIONS)).toBeNull();
		expect(matchStatusName('doing', OPTIONS)).toBeNull();
	});

	it('names the kinds whose value is no status', () => {
		const map = { ...effectiveStateMap({}, null), started: 'in progress', unstarted: 'todo', canceled: '' };
		expect(invalidStateMapKinds(map, OPTIONS)).toEqual(['unstarted', 'canceled']);
		expect(invalidStateMapKinds(map, [])).toHaveLength(6);
	});
});
