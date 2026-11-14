import type { TOrganizationTeam } from '@/core/types/schemas';
import {
	readTeamMenuOrganizations,
	teamMenuOrganizationsOf,
	teamToOpenAfterSwitch,
	withTeams
} from './team-menu-organizations';

const team = (id: string, organizationId: string, name = `Team ${id}`) =>
	({ id, name, organizationId }) as unknown as TOrganizationTeam;

describe('teamMenuOrganizationsOf', () => {
	it('puts the current organization apart and the others by name, each once', () => {
		const result = teamMenuOrganizationsOf(
			[
				{ organizationId: 'labs', organization: { id: 'labs', name: 'Labs' } },
				{ organizationId: 'studio', organization: { id: 'studio', name: 'Studio' } },
				{ organizationId: 'agency', organization: { id: 'agency', name: 'Agency' } },
				{ organizationId: 'labs', organization: { id: 'labs', name: 'Labs' } }
			],
			'studio'
		);

		expect(result.current).toEqual({ id: 'studio', name: 'Studio' });
		expect(result.others).toEqual([
			{ id: 'agency', name: 'Agency' },
			{ id: 'labs', name: 'Labs' }
		]);
	});

	it('leaves out inactive and archived memberships, and keeps an unnamed organization last', () => {
		const result = teamMenuOrganizationsOf(
			[
				{ organizationId: 'old', isActive: false, organization: { name: 'Old' } },
				{ organizationId: 'gone', isArchived: true, organization: { name: 'Gone' } },
				{ organizationId: 'unnamed', organization: { name: '  ' } },
				{ organizationId: 'labs', organization: { name: 'Labs' } }
			],
			'studio'
		);

		expect(result.current).toBeNull();
		expect(result.others.map((organization) => organization.id)).toEqual(['labs', 'unnamed']);
	});

	it('answers no other organization to someone who belongs to one', () => {
		const result = teamMenuOrganizationsOf([{ organizationId: 'studio', organization: { name: 'Studio' } }], 'studio');

		expect(result.others).toEqual([]);
	});
});

describe('withTeams', () => {
	it('lists the teams read for an organization, and an organization not read as one to switch to', () => {
		const result = withTeams(
			[
				{ id: 'labs', name: 'Labs' },
				{ id: 'agency', name: 'Agency' }
			],
			new Map([['labs', [team('t1', 'labs'), team('t2', 'studio'), { id: '', name: '' } as TOrganizationTeam]]])
		);

		expect(result).toEqual([
			{ id: 'labs', name: 'Labs', teams: [team('t1', 'labs')], teamsListed: true },
			{ id: 'agency', name: 'Agency', teams: [], teamsListed: false }
		]);
	});

	it('marks every organization as one to switch to when no team list was read', () => {
		expect(withTeams([{ id: 'labs', name: 'Labs' }], null)).toEqual([
			{ id: 'labs', name: 'Labs', teams: [], teamsListed: false }
		]);
	});
});

describe('readTeamMenuOrganizations', () => {
	const memberships = [
		{ organizationId: 'studio', organization: { name: 'Studio' } },
		{ organizationId: 'labs', organization: { name: 'Labs' } },
		{ organizationId: 'agency', organization: { name: 'Agency' } }
	];

	it("reads each other organization's teams for someone who may, and offers a refused one as a switch", async () => {
		const readTeams = jest.fn(async (organizationId: string) => {
			if (organizationId === 'agency') throw new Error('400 not associated');
			return [team('t1', organizationId)];
		});

		const result = await readTeamMenuOrganizations({
			memberships,
			currentOrganizationId: 'studio',
			listsTeams: true,
			readTeams
		});

		expect(readTeams.mock.calls.map(([organizationId]) => organizationId)).toEqual(['agency', 'labs']);
		expect(result.current).toEqual({ id: 'studio', name: 'Studio' });
		expect(result.others).toEqual([
			{ id: 'agency', name: 'Agency', teams: [], teamsListed: false },
			{ id: 'labs', name: 'Labs', teams: [team('t1', 'labs')], teamsListed: true }
		]);
	});

	it('reads no team for someone kept in the organization of their session', async () => {
		const readTeams = jest.fn();

		const result = await readTeamMenuOrganizations({
			memberships,
			currentOrganizationId: 'studio',
			listsTeams: false,
			readTeams
		});

		expect(readTeams).not.toHaveBeenCalled();
		expect(result.others.every((organization) => !organization.teamsListed)).toBe(true);
	});
});

describe('teamToOpenAfterSwitch', () => {
	const teams = [team('a', 'labs'), team('b', 'labs'), team('c', 'labs')];

	it('opens the first preferred team found there', () => {
		expect(teamToOpenAfterSwitch(teams, ['x', 'b', 'c'])?.id).toBe('b');
	});

	it('opens the first team when no preferred one is there', () => {
		expect(teamToOpenAfterSwitch(teams, [null, undefined, 'x'])?.id).toBe('a');
	});

	it('opens nothing in an organization without a team', () => {
		expect(teamToOpenAfterSwitch([], ['a'])).toBeNull();
	});
});
