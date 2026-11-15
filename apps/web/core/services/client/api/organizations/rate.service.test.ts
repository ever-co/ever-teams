import { rateService } from './rate.service';

const PROJECT_ID = 'project-a';
const EMPLOYEE_ID = 'employee-ana';
const FROM_FIRST_OCTOBER = '2026-10-01T00:00:00+02:00';

function spyOnPut(answer: unknown) {
	return jest.spyOn(rateService, 'put').mockResolvedValue({ data: answer } as never);
}

function sentBodyOf(put: jest.SpyInstance): Record<string, unknown> {
	return put.mock.calls[0][1] as Record<string, unknown>;
}

afterEach(() => {
	jest.restoreAllMocks();
});

describe('RateService.updateEmployeeRates', () => {
	it('sends the day the new rates price tracked time from, and answers how many entries changed price', async () => {
		const put = spyOnPut({ id: EMPLOYEE_ID, billRateValue: 50, repricedTimeLogs: 12 });

		const outcome = await rateService.updateEmployeeRates(EMPLOYEE_ID, {
			billRateValue: 50,
			ratesApplyFrom: FROM_FIRST_OCTOBER
		});

		expect(sentBodyOf(put)).toEqual(
			expect.objectContaining({ billRateValue: 50, ratesApplyFrom: FROM_FIRST_OCTOBER })
		);
		expect(outcome).toEqual({ repricedTimeLogs: 12 });
	});

	it('sends no day when none is picked, and answers no count when Gauzy states none', async () => {
		const put = spyOnPut({ id: EMPLOYEE_ID, billRateValue: 50 });

		const outcome = await rateService.updateEmployeeRates(EMPLOYEE_ID, { billRateValue: 50 });

		expect(sentBodyOf(put)).not.toHaveProperty('ratesApplyFrom');
		expect(outcome).toEqual({ repricedTimeLogs: null });
	});

	it('reads no count from an answer that is not one', async () => {
		spyOnPut({ repricedTimeLogs: '12' });

		await expect(rateService.updateEmployeeRates(EMPLOYEE_ID, { billRateValue: 50 })).resolves.toEqual({
			repricedTimeLogs: null
		});
	});
});

describe('RateService.updateOwnProfileRates', () => {
	it('sends the day through the own profile too', async () => {
		const put = spyOnPut({ id: EMPLOYEE_ID, repricedTimeLogs: 3 });

		const outcome = await rateService.updateOwnProfileRates(EMPLOYEE_ID, {
			billRateValue: 50,
			ratesApplyFrom: FROM_FIRST_OCTOBER
		});

		expect(sentBodyOf(put)).toEqual(expect.objectContaining({ ratesApplyFrom: FROM_FIRST_OCTOBER }));
		expect(outcome).toEqual({ repricedTimeLogs: 3 });
	});
});

describe('RateService project rates', () => {
	it("sends the day with a project's client rate", async () => {
		const put = spyOnPut({ id: PROJECT_ID, billRateValue: 80, repricedTimeLogs: 0 });

		const outcome = await rateService.updateProjectRate(PROJECT_ID, 80, FROM_FIRST_OCTOBER);

		expect(put).toHaveBeenCalledWith(
			`/organization-projects/${PROJECT_ID}/rate`,
			expect.objectContaining({ billRateValue: 80, applyFrom: FROM_FIRST_OCTOBER })
		);
		expect(outcome).toEqual({ repricedTimeLogs: 0 });
	});

	it("sends a member's client rate on a project without a day when none is picked", async () => {
		const put = spyOnPut({ organizationProjectId: PROJECT_ID, employeeId: EMPLOYEE_ID, billRateValue: 70 });

		const outcome = await rateService.updateProjectMemberRate(PROJECT_ID, EMPLOYEE_ID, 70);

		expect(sentBodyOf(put)).not.toHaveProperty('applyFrom');
		expect(outcome).toEqual({ repricedTimeLogs: null });
	});
});
