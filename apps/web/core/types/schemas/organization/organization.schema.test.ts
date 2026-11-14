/**
 * The workspace's duration rounding rule as the API sends it: a numeric column may come back as text, and a rule
 * read as nothing would silently stop rounding reports and invoices.
 */
import { organizationSchema } from './organization.schema';

const interval = organizationSchema.shape.durationRoundingInterval;
const direction = organizationSchema.shape.durationRoundingDirection;

describe('organizationSchema (duration rounding)', () => {
	it('reads an interval sent as text as its minutes', () => {
		expect(interval.parse('15')).toBe(15);
		expect(interval.parse(' 6 ')).toBe(6);
	});

	it('keeps an interval sent as a number, or cleared', () => {
		expect(interval.parse(30)).toBe(30);
		expect(interval.parse(null)).toBeNull();
	});

	it('reads text that is no number as no rule', () => {
		expect(interval.parse('quarter')).toBeNull();
		expect(interval.parse('')).toBeNull();
	});

	it('leaves both fields out against an API without them, so the settings row stays hidden', () => {
		const shape = organizationSchema.pick({ durationRoundingInterval: true, durationRoundingDirection: true });

		expect(shape.parse({})).toEqual({});
	});

	it('reads a direction it does not know as no rule', () => {
		expect(direction.parse('UP')).toBe('UP');
		expect(direction.parse('SIDEWAYS')).toBeNull();
	});
});
