import { initializeWorkSchedule, WORKDAY_ROW_CLASS } from './working-hours-utils';

describe('initializeWorkSchedule', () => {
	it('assigns stable IDs once while preserving supplied IDs', () => {
		const ids = ['first', 'second'];
		const schedule = initializeWorkSchedule(
			[
				{
					day: 'Monday',
					enabled: true,
					timeSlots: [
						{ startTime: '09:00', endTime: '12:00' },
						{ id: 'saved-slot', startTime: '13:00', endTime: '17:00' }
					]
				}
			],
			() => ids.shift() || 'fallback'
		);

		expect(schedule[0].timeSlots.map(({ id }) => id)).toEqual(['slot-first', 'saved-slot']);
		schedule[0].timeSlots[0].startTime = '10:00';
		expect(schedule[0].timeSlots[0].id).toBe('slot-first');
	});

	it('uses a two-column narrow layout before restoring the desktop columns', () => {
		expect(WORKDAY_ROW_CLASS).toContain('grid-cols-[minmax(0,1fr)_2rem]');
		expect(WORKDAY_ROW_CLASS).toContain('sm:grid-cols-[10rem_minmax(0,1fr)_2rem]');
	});
});
