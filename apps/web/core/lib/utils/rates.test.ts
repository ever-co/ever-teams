import {
	canEditMemberRateOnProject,
	canManageProjectRates,
	changedEmployeeRatesOf,
	changedPayRateOf,
	currencyCodesOf,
	currencyLabelOf,
	holdsPayRatePermission,
	holdsRateAdminPermission,
	rateAmountTextOf,
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

describe('currency and amount text', () => {
	it('lists current ISO codes, sorted, and keeps an unlisted current value selectable', () => {
		const codes = currencyCodesOf(null);
		expect(codes).toContain('USD');
		expect(codes).toContain('EUR');
		expect(codes).toEqual([...codes].sort());
		expect(currencyCodesOf('XYZ')).toContain('XYZ');
	});

	it('names a currency in the page language, and falls back to the code', () => {
		expect(currencyLabelOf('EUR', 'en')).toBe('EUR · Euro');
		expect(currencyLabelOf('not-a-code', 'en')).toBe('not-a-code');
	});

	it('writes a rate as money when its currency is known, and nothing without a rate', () => {
		expect(rateAmountTextOf('45.5', 'USD', 'en-US')).toBe('$45.50');
		expect(rateAmountTextOf(45, null, 'en-US')).toBe('45');
		expect(rateAmountTextOf(null, 'USD', 'en-US')).toBeNull();
	});
});

describe('holdsRateAdminPermission', () => {
	it('lets an organization admin edit member rates, and not a team manager without the permission', () => {
		expect(holdsRateAdminPermission(['ORG_EMPLOYEES_EDIT'])).toBe(true);
		expect(holdsRateAdminPermission(['ORG_TEAM_EDIT', 'PROFILE_EDIT'])).toBe(false);
		expect(holdsRateAdminPermission([])).toBe(false);
	});
});

describe('canEditMemberRateOnProject', () => {
	it("keeps a project manager who is not an admin off their own rate, and lets them set the others'", () => {
		expect(
			canEditMemberRateOnProject({ isAdmin: false, callerEmployeeId: 'emp-1', memberEmployeeId: 'emp-1' })
		).toBe(false);
		expect(
			canEditMemberRateOnProject({ isAdmin: false, callerEmployeeId: 'emp-1', memberEmployeeId: 'emp-2' })
		).toBe(true);
	});

	it("lets an admin set anyone's rate on a project, their own included", () => {
		expect(
			canEditMemberRateOnProject({ isAdmin: true, callerEmployeeId: 'emp-1', memberEmployeeId: 'emp-1' })
		).toBe(true);
	});
});

describe('changedEmployeeRatesOf', () => {
	const initial = { value: 40, currency: 'EUR', weeklyLimit: 35 };

	it('sends only the weekly limit when that is all the admin changed', () => {
		expect(changedEmployeeRatesOf(initial, { ...initial, weeklyLimit: 20 })).toEqual({ reWeeklyLimit: 20 });
	});

	it('leaves the currency out when the admin kept the one shown, so a member without one keeps none', () => {
		const changes = changedEmployeeRatesOf(initial, { ...initial, value: 55 });

		expect(changes).toEqual({ billRateValue: 55 });
		expect('billRateCurrency' in changes).toBe(false);
	});

	it('sends a picked currency and a cleared rate', () => {
		expect(changedEmployeeRatesOf(initial, { ...initial, value: null, currency: 'USD' })).toEqual({
			billRateValue: null,
			billRateCurrency: 'USD'
		});
	});

	it('sends nothing when nothing changed', () => {
		expect(changedEmployeeRatesOf(initial, { ...initial })).toEqual({});
	});
});

describe('changedPayRateOf', () => {
	const initial = { value: 30, currency: 'EUR' };

	it('sends only the pay rate fields the admin changed', () => {
		expect(changedPayRateOf(initial, { ...initial, value: 32 })).toEqual({ payRateValue: 32 });
		expect(changedPayRateOf(initial, { ...initial, currency: 'USD' })).toEqual({ payRateCurrency: 'USD' });
	});

	it('clears the pay rate with null and sends nothing when nothing changed', () => {
		expect(changedPayRateOf(initial, { ...initial, value: null })).toEqual({ payRateValue: null });
		expect(changedPayRateOf(initial, { ...initial })).toEqual({});
	});
});

describe('holdsPayRatePermission', () => {
	it('is ORG_EMPLOYEES_EDIT only, the permission Gauzy asks for to read or set a pay rate', () => {
		expect(holdsPayRatePermission(['ORG_EMPLOYEES_EDIT'])).toBe(true);
		expect(holdsPayRatePermission(['CHANGE_SELECTED_EMPLOYEE'])).toBe(false);
		expect(holdsPayRatePermission([])).toBe(false);
	});
});
