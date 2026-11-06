import { taskOnStartProject, teamDefaultProjectId, timerStartProjectId } from './team-default-project';

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

describe('timerStartProjectId', () => {
	const team = { defaultProjectId: 'project-team', projects: [{ id: 'project-team' }] };

	it("files a start under the task's project", () => {
		expect(timerStartProjectId({ projectId: 'project-task' }, team)).toBe('project-task');
	});

	it("falls back to the team's default project for a task saved without one", () => {
		expect(timerStartProjectId({ projectId: null }, team)).toBe('project-team');
		expect(timerStartProjectId({}, { projects: [{ id: 'project-first' }] })).toBe('project-first');
	});

	it('sends no project when neither the task nor the team has one', () => {
		expect(timerStartProjectId({ projectId: null }, { projects: [] })).toBeNull();
		expect(timerStartProjectId(undefined, null)).toBeNull();
	});
});

describe('taskOnStartProject', () => {
	const team = { defaultProjectId: 'project-team', projects: [{ id: 'project-team' }] };

	it("puts a task saved without a project under the team's default project, keeping the rest of the task", () => {
		expect(taskOnStartProject({ id: 'task-a', projectId: null }, team)).toEqual({
			id: 'task-a',
			projectId: 'project-team'
		});
	});

	it('keeps the project of a task that has one, and no task stays none', () => {
		expect(taskOnStartProject({ id: 'task-a', projectId: 'project-task' }, team)).toEqual({
			id: 'task-a',
			projectId: 'project-task'
		});
		expect(taskOnStartProject(null, team)).toBeNull();
	});
});
