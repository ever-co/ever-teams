import { teamDefaultProjectId } from './team-default-project';

describe('teamDefaultProjectId', () => {
	it('takes the default project the team names, wherever it sits among its projects', () => {
		const team = { defaultProjectId: 'project-b', projects: [{ id: 'project-a' }, { id: 'project-b' }] };

		expect(teamDefaultProjectId(team)).toBe('project-b');
	});

	it('falls back to the first project of a team that names none, as before', () => {
		expect(teamDefaultProjectId({ projects: [{ id: 'project-a' }, { id: 'project-b' }] })).toBe('project-a');
		expect(teamDefaultProjectId({ defaultProjectId: null, projects: [{ id: 'project-a' }] })).toBe('project-a');
	});

	it('answers null for a team without projects, or no team', () => {
		expect(teamDefaultProjectId({ projects: [] })).toBeNull();
		expect(teamDefaultProjectId({})).toBeNull();
		expect(teamDefaultProjectId(null)).toBeNull();
	});
});
