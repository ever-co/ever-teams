import type { TTask } from '@/core/types/schemas/task/task.schema';
import { isHeldTeamTask, isTimerTaskOfTeam } from './task.utils';

const taskOfTeam = (id: string, teamId: string) => ({ id, teams: [{ id: teamId }] }) as unknown as TTask;

describe('isHeldTeamTask', () => {
	it('keeps the held task of the team when the team task list no longer lists it', () => {
		expect(isHeldTeamTask(taskOfTeam('task-a', 'team-a'), 'task-a', 'team-a')).toBe(true);
	});

	it('does not keep another task, a task of another team, or no task', () => {
		expect(isHeldTeamTask(taskOfTeam('task-a', 'team-a'), 'task-b', 'team-a')).toBe(false);
		expect(isHeldTeamTask(taskOfTeam('task-a', 'team-b'), 'task-a', 'team-a')).toBe(false);
		expect(isHeldTeamTask(null, 'task-a', 'team-a')).toBe(false);
	});

	describe('a task read from a daily plan, which comes without its teams (#5119)', () => {
		const plannedTask = { id: 'task-a' } as unknown as TTask;

		it('keeps it while the timer runs on it', () => {
			expect(isHeldTeamTask(plannedTask, 'task-a', 'team-a', 'task-a')).toBe(true);
		});

		it('does not keep it when the timer runs on another task or does not run', () => {
			expect(isHeldTeamTask(plannedTask, 'task-a', 'team-a', 'task-b')).toBe(false);
			expect(isHeldTeamTask(plannedTask, 'task-a', 'team-a', null)).toBe(false);
		});

		it('does not keep a task of another team because the timer runs on it', () => {
			expect(isHeldTeamTask(taskOfTeam('task-a', 'team-b'), 'task-a', 'team-a', 'task-a')).toBe(false);
		});

		it("keeps it while the member's record in the team names it, and not when it names another task", () => {
			expect(isHeldTeamTask(plannedTask, 'task-a', 'team-a', null, 'task-a')).toBe(true);
			expect(isHeldTeamTask(plannedTask, 'task-a', 'team-a', null, 'task-b')).toBe(false);
			expect(isHeldTeamTask(taskOfTeam('task-a', 'team-b'), 'task-a', 'team-a', null, 'task-a')).toBe(false);
		});
	});
});

describe('isTimerTaskOfTeam', () => {
	const listed = [taskOfTeam('task-listed', 'team-a')];

	it('counts a listed team task and the active team task held outside the list', () => {
		expect(isTimerTaskOfTeam('task-listed', listed, null)).toBe(true);
		expect(isTimerTaskOfTeam('task-held', listed, taskOfTeam('task-held', 'team-a'))).toBe(true);
	});

	it('does not count a task that is neither listed nor the active one', () => {
		expect(isTimerTaskOfTeam('task-other', listed, taskOfTeam('task-held', 'team-a'))).toBe(false);
	});
});
