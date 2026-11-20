import {
	buildTeamTasksGroups,
	DEFAULT_TEAM_TASKS_VIEW,
	labelColorOf,
	NONE_VALUE,
	type TeamTasksLookups,
	type TeamTasksViewSettings
} from './team-tasks-view';
import { viewSettingsFromStorage } from './team-tasks-view-storage';
import type { TTask } from '@/core/types/schemas/task/task.schema';

type TagInput = { name: string; color?: string | null };

const task = (id: string, tags?: TagInput[]) => ({ id, tags, createdAt: '2026-01-01' }) as unknown as TTask;
const idsOf = (tasks: { id: string }[]) => tasks.map((item) => item.id);

const lookups: TeamTasksLookups = { statuses: [], projectNames: new Map(), memberNames: new Map() };
const byLabel: TeamTasksViewSettings = { ...DEFAULT_TEAM_TASKS_VIEW, grouping: 'label', ordering: 'number' };

describe('grouping the team tasks by label', () => {
	it('lists a task under each of its labels, labels by name, unlabelled tasks last', () => {
		const tasks = [
			task('a', [{ name: 'Frontend' }, { name: 'Bug' }]),
			task('b', [{ name: 'Bug' }]),
			task('c'),
			task('d', [])
		];
		const groups = buildTeamTasksGroups(tasks, byLabel, lookups, []);
		expect(groups.map((group) => group.value)).toEqual(['Bug', 'Frontend', NONE_VALUE]);
		expect(groups.map((group) => group.key)).toEqual(['label:Bug', 'label:Frontend', `label:${NONE_VALUE}`]);
		expect(idsOf(groups[0].tasks).sort()).toEqual(['a', 'b']);
		expect(idsOf(groups[1].tasks)).toEqual(['a']);
		expect(idsOf(groups[2].tasks).sort()).toEqual(['c', 'd']);
	});

	it('counts a label repeated on one task, or written with stray spaces, once', () => {
		const tasks = [task('a', [{ name: 'Bug' }, { name: ' Bug ' }, { name: 'Bug' }])];
		const groups = buildTeamTasksGroups(tasks, byLabel, lookups, []);
		expect(groups).toHaveLength(1);
		expect(groups[0].value).toBe('Bug');
		expect(idsOf(groups[0].tasks)).toEqual(['a']);
	});

	it('treats a blank label name as no label', () => {
		const groups = buildTeamTasksGroups([task('a', [{ name: '  ' }])], byLabel, lookups, []);
		expect(groups.map((group) => group.value)).toEqual([NONE_VALUE]);
	});

	it('hides the unlabelled group when no task is unlabelled, and an empty group stays hidden', () => {
		const groups = buildTeamTasksGroups([task('a', [{ name: 'Bug' }])], byLabel, lookups, []);
		expect(groups.map((group) => group.value)).toEqual(['Bug']);
	});

	it('takes a label colour from the first task that carries one', () => {
		const tasks = [
			task('a', [{ name: 'Bug', color: null }]),
			task('b', [{ name: 'Bug', color: '#ff0000' }]),
			task('c', [{ name: 'Bug', color: '#00ff00' }])
		];
		expect(labelColorOf(tasks, 'Bug')).toBe('#ff0000');
		expect(labelColorOf(tasks, 'Other')).toBeUndefined();
		expect(labelColorOf([task('x')], 'Bug')).toBeUndefined();
	});
});

describe('a stored label grouping', () => {
	it('is kept when read back', () => {
		expect(viewSettingsFromStorage({ grouping: 'label' }).grouping).toBe('label');
	});

	it.each(['status', 'priority', 'assignee', 'project', 'issueType', 'none'])('keeps %s', (grouping) => {
		expect(viewSettingsFromStorage({ grouping }).grouping).toBe(grouping);
	});

	it('still falls back on the default for an unknown grouping', () => {
		expect(viewSettingsFromStorage({ grouping: 'labels' }).grouping).toBe(DEFAULT_TEAM_TASKS_VIEW.grouping);
	});
});
