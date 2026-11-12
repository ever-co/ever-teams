/**
 * A member is deactivated with Gauzy's "End Work" and restored with its "Back to Work", both on `PUT /employee/:id`,
 * and the deactivated members are read from `GET /employee/pagination`, the one list that still answers them.
 */
// apps/web/.env sets NEXT_PUBLIC_GAUZY_API_SERVER_URL, which would otherwise decide the API mode of every case.
jest.mock('@/core/constants/config/constants', () => ({
	...jest.requireActual('@/core/constants/config/constants'),
	GAUZY_API_BASE_SERVER_URL: { value: undefined }
}));

import qs from 'qs';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { WorkEndNotAppliedError } from '@/core/lib/utils/member-access';
import { employeeService } from './employee.service';

const publishedApiOrigin = GAUZY_API_BASE_SERVER_URL as { value: string | undefined };

const ORGANIZATION = { organizationId: 'organization-1', tenantId: 'tenant-1' };

function answer(data: unknown) {
	return { config: {}, data, headers: {}, status: 200, statusText: 'OK' } as never;
}

function employee(id: string) {
	return { id, endWork: '2026-11-05T09:00:00.000Z', user: { email: `${id}@example.com` }, teams: [] };
}

afterEach(() => {
	jest.restoreAllMocks();
	publishedApiOrigin.value = undefined;
});

describe('EmployeeService.getInactiveEmployeesPage', () => {
	it('asks Gauzy for the inactive and archived employees of the organization in direct mode', async () => {
		publishedApiOrigin.value = 'https://api.example.test';
		const get = jest.spyOn(employeeService, 'get').mockResolvedValue(answer({ items: [], total: 0 }));
		const signal = new AbortController().signal;

		await employeeService.getInactiveEmployeesPage(2, { ...ORGANIZATION, signal });

		const [url, config] = get.mock.calls[0];
		const [path, search] = url.split('?');
		expect(path).toBe('/employee/pagination');
		expect(qs.parse(search)).toEqual({
			where: {
				organizationId: 'organization-1',
				tenantId: 'tenant-1',
				isActive: 'false',
				isArchived: 'true'
			},
			relations: ['user', 'teams'],
			take: '100',
			skip: '2'
		});
		expect(config).toEqual({ tenantId: 'tenant-1', signal });
	});

	it('asks its own route for the page in proxy mode, which reads the organization from the session', async () => {
		const get = jest.spyOn(employeeService, 'get').mockResolvedValue(answer({ items: [], total: 0 }));

		await employeeService.getInactiveEmployeesPage(3, ORGANIZATION);

		expect(get.mock.calls[0][0]).toBe('/employee/inactive?page=3');
	});

	it('keeps of an employee only what the inactive list shows', async () => {
		const stored = { ...employee('employee-1'), payRateValue: 80, user: { email: 'ana@example.com', hash: 'x' } };
		jest.spyOn(employeeService, 'get').mockResolvedValue(answer({ items: [stored], total: 1 }));

		const page = await employeeService.getInactiveEmployeesPage(1, ORGANIZATION);

		expect(page.items).toEqual([
			{ id: 'employee-1', endWork: '2026-11-05T09:00:00.000Z', user: { email: 'ana@example.com' }, teams: [] }
		]);
	});
});

describe('EmployeeService.getInactiveEmployees', () => {
	it('reads one page when it holds every inactive employee', async () => {
		const get = jest
			.spyOn(employeeService, 'get')
			.mockResolvedValue(answer({ items: [employee('employee-1'), employee('employee-2')], total: 2 }));

		const employees = await employeeService.getInactiveEmployees(ORGANIZATION);

		expect(employees.map((item) => item.id)).toEqual(['employee-1', 'employee-2']);
		expect(get).toHaveBeenCalledTimes(1);
	});

	it('reads the pages the total of the first one calls for, and keeps their order', async () => {
		const get = jest.spyOn(employeeService, 'get').mockImplementation(async (url: string) => {
			const page = new URL(url, 'https://client.test').searchParams.get('page');
			return answer({ items: [employee(`employee-of-page-${page}`)], total: 201 });
		});

		const employees = await employeeService.getInactiveEmployees(ORGANIZATION);

		expect(get.mock.calls.map(([url]) => url)).toEqual([
			'/employee/inactive?page=1',
			'/employee/inactive?page=2',
			'/employee/inactive?page=3'
		]);
		expect(employees.map((item) => item.id)).toEqual([
			'employee-of-page-1',
			'employee-of-page-2',
			'employee-of-page-3'
		]);
	});
});

describe('EmployeeService.setEmployeeWorkEnd', () => {
	const member = { employeeId: 'employee-1', ...ORGANIZATION };

	it('ends the work of a member with a date, and sends only the keys the employee route declares', async () => {
		const saved = { id: 'employee-1', isActive: false, isArchived: true };
		const put = jest.spyOn(employeeService, 'put').mockResolvedValue(answer(saved));

		await employeeService.setEmployeeWorkEnd({ ...member, endWork: '2026-11-12T10:00:00.000Z' });

		expect(put).toHaveBeenCalledWith('/employee/employee-1', {
			organizationId: 'organization-1',
			tenantId: 'tenant-1',
			endWork: '2026-11-12T10:00:00.000Z'
		});
	});

	it('brings a member back by clearing the date', async () => {
		const saved = { id: 'employee-1', isActive: true, isArchived: false };
		const put = jest.spyOn(employeeService, 'put').mockResolvedValue(answer(saved));

		await employeeService.setEmployeeWorkEnd({ ...member, endWork: null });

		expect(put).toHaveBeenCalledWith('/employee/employee-1', {
			organizationId: 'organization-1',
			tenantId: 'tenant-1',
			endWork: null
		});
	});

	it('refuses to call a restoration done when Gauzy answers the employee as they were', async () => {
		jest.spyOn(employeeService, 'put').mockResolvedValue(answer({ id: 'employee-1', endWork: null }));

		await expect(employeeService.setEmployeeWorkEnd({ ...member, endWork: null })).rejects.toBeInstanceOf(
			WorkEndNotAppliedError
		);
	});

	it('refuses to call a deactivation done when Gauzy answers the employee still active', async () => {
		jest.spyOn(employeeService, 'put').mockResolvedValue(answer({ id: 'employee-1', isActive: true }));

		await expect(
			employeeService.setEmployeeWorkEnd({ ...member, endWork: '2026-11-12T10:00:00.000Z' })
		).rejects.toBeInstanceOf(WorkEndNotAppliedError);
	});

	it("passes Gauzy's refusal on", async () => {
		jest.spyOn(employeeService, 'put').mockRejectedValue(new Error('Forbidden'));

		await expect(employeeService.setEmployeeWorkEnd({ ...member, endWork: null })).rejects.toThrow('Forbidden');
	});
});
