import {
	canManageProjectRates,
	effectiveBillRate,
	isRatesReadUnavailable,
	parseRateInput,
	rateInputTextOf,
	rateValueOf
} from './rates';

describe('rateValueOf', () => {
	it('reads a rate Gauzy returns as a number or as a decimal string', () => {
		expect(rateValueOf(45)).toBe(45);
		expect(rateValueOf('45.50')).toBe(45.5);
		expect(rateValueOf(0)).toBe(0);
	});

	it('treats a missing, unreadable or negative value as no rate', () => {
		expect(rateValueOf(null)).toBeNull();
		expect(rateValueOf(undefined)).toBeNull();
		expect(rateValueOf('')).toBeNull();
		expect(rateValueOf('abc')).toBeNull();
		expect(rateValueOf(-1)).toBeNull();
	});
});

describe('effectiveBillRate', () => {
	it("takes the member's rate on the project first, then the project's, then the employee's", () => {
		expect(effectiveBillRate({ memberRate: '60', projectRate: 50, employeeRate: 40 })).toBe(60);
		expect(effectiveBillRate({ memberRate: null, projectRate: '50.00', employeeRate: 40 })).toBe(50);
		expect(effectiveBillRate({ memberRate: null, projectRate: null, employeeRate: 40 })).toBe(40);
	});

	it('keeps a rate of 0 set on purpose instead of falling back', () => {
		expect(effectiveBillRate({ memberRate: 0, projectRate: 50, employeeRate: 40 })).toBe(0);
	});

	it('has no rate when none is set', () => {
		expect(effectiveBillRate({})).toBeNull();
	});
});

describe('parseRateInput', () => {
	it('reads a number, with a dot or a comma', () => {
		expect(parseRateInput('45')).toEqual({ value: 45, problem: null });
		expect(parseRateInput(' 45,5 ')).toEqual({ value: 45.5, problem: null });
	});

	it('clears the rate when the field is empty', () => {
		expect(parseRateInput('   ')).toEqual({ value: null, problem: null });
	});

	it('refuses text and negative numbers', () => {
		expect(parseRateInput('forty')).toEqual({ value: null, problem: 'invalid' });
		expect(parseRateInput('-3')).toEqual({ value: null, problem: 'negative' });
	});

	it('writes a stored rate back as the field text', () => {
		expect(rateInputTextOf('45.00')).toBe('45');
		expect(rateInputTextOf(null)).toBe('');
	});
});

describe('canManageProjectRates', () => {
	const manager = { employeeId: 'emp-1', isManager: true, isActive: true, isArchived: false };

	it('lets an organization admin manage any project', () => {
		expect(canManageProjectRates({ permissions: ['ORG_EMPLOYEES_EDIT'], members: [], employeeId: null })).toBe(
			true
		);
		expect(
			canManageProjectRates({ permissions: ['CHANGE_SELECTED_EMPLOYEE'], members: [], employeeId: null })
		).toBe(true);
	});

	it('lets a current manager of the project manage its rates', () => {
		expect(canManageProjectRates({ permissions: [], members: [manager], employeeId: 'emp-1' })).toBe(true);
	});

	it('refuses a plain member, a former manager and someone else', () => {
		const member = { ...manager, isManager: false };
		const archivedManager = { ...manager, isArchived: true };
		const inactiveManager = { ...manager, isActive: false };
		expect(canManageProjectRates({ permissions: [], members: [member], employeeId: 'emp-1' })).toBe(false);
		expect(canManageProjectRates({ permissions: [], members: [archivedManager], employeeId: 'emp-1' })).toBe(false);
		expect(canManageProjectRates({ permissions: [], members: [inactiveManager], employeeId: 'emp-1' })).toBe(false);
		expect(canManageProjectRates({ permissions: [], members: [manager], employeeId: 'emp-2' })).toBe(false);
		expect(canManageProjectRates({ permissions: [], members: [manager], employeeId: null })).toBe(false);
	});
});

describe('isRatesReadUnavailable', () => {
	it('treats a 404 (rates not deployed) and a 403 (not allowed) as unavailable, quietly', () => {
		expect(isRatesReadUnavailable({ response: { status: 404 } })).toBe(true);
		expect(isRatesReadUnavailable({ statusCode: 403 })).toBe(true);
	});

	it('keeps any other failure an error', () => {
		expect(isRatesReadUnavailable({ response: { status: 500 } })).toBe(false);
		expect(isRatesReadUnavailable(new Error('offline'))).toBe(false);
	});
});
