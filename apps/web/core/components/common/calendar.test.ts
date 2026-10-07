import { compactCalendarClassNames } from './calendar';

describe('compactCalendarClassNames', () => {
	it('keeps a two-month calendar dense enough for application popovers', () => {
		expect(compactCalendarClassNames.months).toContain('gap-2');
		expect(compactCalendarClassNames.month).toContain('space-y-2');
		expect(compactCalendarClassNames.day).toContain('h-8');
		expect(compactCalendarClassNames.day).toContain('w-8');
		expect(compactCalendarClassNames.head_cell).toContain('w-8');
	});
});
