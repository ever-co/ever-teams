import type { Creator, ITeamTask } from '../../../../services/interfaces/ITask';
import { creatorIdOf, creatorOf } from './task-creator';

function personNamed(id: string, firstName: string): Creator {
	return { id, firstName, lastName: 'Arden', imageUrl: '' } as Creator;
}

function taskWith(fields: Partial<ITeamTask>): ITeamTask {
	return fields as ITeamTask;
}

describe('the creator of a task', () => {
	it("is the API's createdByUser", () => {
		const kofi = personNamed('user-kofi', 'Kofi');
		const task = taskWith({ createdByUserId: 'user-kofi', createdByUser: kofi });

		expect(creatorOf(task)).toBe(kofi);
		expect(creatorIdOf(task)).toBe('user-kofi');
	});

	it('is still read from creator in an answer that names it so', () => {
		const kofi = personNamed('user-kofi', 'Kofi');
		const task = taskWith({ creatorId: 'user-kofi', creator: kofi });

		expect(creatorOf(task)).toBe(kofi);
		expect(creatorIdOf(task)).toBe('user-kofi');
	});

	it('is nobody while the task has not loaded', () => {
		expect(creatorOf(undefined)).toBeUndefined();
		expect(creatorIdOf(undefined)).toBeUndefined();
	});
});
