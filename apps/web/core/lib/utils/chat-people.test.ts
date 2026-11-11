import { mergeChatPeople, presenceByEmployee } from './chat-people';

describe('mergeChatPeople', () => {
	it('adds the people of the organization who are not in the active team', () => {
		const people = mergeChatPeople(
			[{ employeeId: 'e1', userId: 'u1', name: 'Ada', imageUrl: 'ada.png' }],
			[
				{ employeeId: 'e1', userId: 'u1', name: 'Ada L.', imageUrl: 'other.png' },
				{ employeeId: 'e2', userId: 'u2', name: 'Grace', imageUrl: null }
			]
		);
		expect(people.list.map((person) => person.name)).toEqual(['Ada', 'Grace']);
		expect(people.byEmployee.get('e2')).toEqual({ employeeId: 'e2', userId: 'u2', name: 'Grace', imageUrl: null });
		expect(people.byUser.get('u2')?.name).toBe('Grace');
	});

	it('keeps the team member as shown, and fills only what it lacks', () => {
		const people = mergeChatPeople([{ employeeId: 'e1', userId: null, name: 'Ada', imageUrl: null }], [{ employeeId: 'e1', userId: 'u1', name: 'Ada L.', imageUrl: 'ada.png' }]);
		expect(people.byEmployee.get('e1')).toEqual({ employeeId: 'e1', userId: 'u1', name: 'Ada', imageUrl: 'ada.png' });
		expect(people.byUser.get('u1')?.name).toBe('Ada');
	});

	it('resolves a person with no name by id, and leaves them out of the suggestions', () => {
		const people = mergeChatPeople([], [{ employeeId: 'e3', userId: 'u3', name: '  ' }, { employeeId: '', name: 'No id' }]);
		expect(people.byEmployee.has('e3')).toBe(true);
		expect(people.list).toEqual([]);
	});

	it('answers the team alone while the list of the organization is not there', () => {
		const people = mergeChatPeople([{ employeeId: 'e1', userId: 'u1', name: 'Ada', imageUrl: null }], []);
		expect(people.list).toHaveLength(1);
	});
});

describe('presenceByEmployee', () => {
	it('keys the status of each member by employee id, from either field, and skips one without', () => {
		const members = [
			{ employeeId: 'employee-ana', status: 'running' },
			{ employee: { id: 'employee-bo' }, status: 'idle' },
			{ employeeId: null, status: 'online' }
		];
		const presence = presenceByEmployee(members, (member) => member.status);
		expect([...presence.entries()]).toEqual([
			['employee-ana', 'running'],
			['employee-bo', 'idle']
		]);
	});
});
