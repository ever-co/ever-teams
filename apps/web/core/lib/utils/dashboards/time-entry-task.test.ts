import { describe, expect, it } from '@jest/globals';
import type { TOrganizationProject } from '@/core/types/schemas/organization/organization-project.schema';
import {
	entryProjectIdOf,
	entryTaskChangeOf,
	findProject,
	isEntryOfListedTeam,
	projectChoicesFor,
	taskChoicesOfEntry
} from './time-entry-task';

function projectOf(id: string) {
	return { id, name: id } as TOrganizationProject;
}

const site = projectOf('project-site');
const mobile = projectOf('project-mobile');
const projects = [site, mobile];

describe('project of a time entry', () => {
	it("files the entry under the task's own project, or else the one picked by hand", () => {
		expect(entryProjectIdOf({ projectId: 'project-site' }, 'project-mobile')).toBe('project-site');
		expect(entryProjectIdOf({ projectId: null }, 'project-mobile')).toBe('project-mobile');
		expect(entryProjectIdOf(undefined, '')).toBe('');
	});

	it("offers only the task's project when the task has one", () => {
		expect(projectChoicesFor(null, undefined, projects)).toBe(projects);
		expect(projectChoicesFor('project-site', findProject('project-site', projects), projects)).toEqual([site]);
		expect(projectChoicesFor('project-archived', findProject('project-archived', projects), projects)).toEqual([]);
	});
});

describe('task of a time entry', () => {
	const entryTask = { id: 'task-entry', projectId: 'project-site' };
	const teamTasks = [{ id: 'task-a' }, { id: 'task-b' }];

	it('lets an entry move to a task of the listed team only when it belongs to that team or to none', () => {
		expect(isEntryOfListedTeam('team-a', 'team-a')).toBe(true);
		expect(isEntryOfListedTeam(null, 'team-a')).toBe(true);
		expect(isEntryOfListedTeam('team-b', 'team-a')).toBe(false);
		expect(isEntryOfListedTeam('team-b', undefined)).toBe(false);
	});

	it("keeps the entry's own task among the choices when the list does not hold it", () => {
		expect(taskChoicesOfEntry(entryTask, teamTasks)).toEqual([entryTask, ...teamTasks]);
		expect(taskChoicesOfEntry({ id: 'task-a' }, teamTasks)).toEqual(teamTasks);
		expect(taskChoicesOfEntry(undefined, teamTasks)).toEqual(teamTasks);
	});

	it('sends nothing while the task is the one the entry already has', () => {
		expect(entryTaskChangeOf('task-entry', entryTask, 'project-mobile')).toBeNull();
		expect(entryTaskChangeOf('task-entry', undefined, 'project-mobile')).toBeNull();
	});

	it("sends the new task with its own project, so the entry's time moves to both", () => {
		const taskInMobile = { id: 'task-mobile', projectId: 'project-mobile' };

		expect(entryTaskChangeOf('task-entry', taskInMobile, 'project-site')).toStrictEqual({
			taskId: 'task-mobile',
			projectId: 'project-mobile'
		});
	});

	it("keeps the entry's project for a task without one, and sends no empty project", () => {
		const looseTask = { id: 'task-loose', projectId: null };

		expect(entryTaskChangeOf('task-entry', looseTask, 'project-site')).toStrictEqual({
			taskId: 'task-loose',
			projectId: 'project-site'
		});
		expect(entryTaskChangeOf('task-entry', looseTask, '')).toStrictEqual({
			taskId: 'task-loose',
			projectId: undefined
		});
	});
});
