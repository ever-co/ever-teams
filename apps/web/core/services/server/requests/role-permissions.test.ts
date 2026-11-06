/**
 * In proxy mode the permissions page reaches Gauzy through getRolePermissionsRequest. Gauzy's
 * `GET /role-permissions` filters on `where` and ignores the `data` param, so without `where[roleId]`
 * the page got the rows of every role, and a toggle could show and update another role's permission.
 */
import qs from 'qs';
import { getRolePermissionsRequest } from './role-permissions';

const mockServerFetch = jest.fn();

jest.mock('../fetch', () => ({
	serverFetch: (...args: unknown[]) => mockServerFetch(...args)
}));

type RolePermissionRow = { id: string; roleId: string; tenantId: string; permission: string; enabled: boolean };
type GauzyWhere = { roleId?: string; tenantId?: string };

const TENANT_ID = 'tenant-1';
const ADMIN_ROLE_ID = 'admin-role';
const EMPLOYEE_ROLE_ID = 'employee-role';

// The same permission is on for one role and off for the other, the case the page got wrong
const ROWS: RolePermissionRow[] = [
	{ id: 'row-1', roleId: ADMIN_ROLE_ID, tenantId: TENANT_ID, permission: 'ADMIN_DASHBOARD_VIEW', enabled: true },
	{ id: 'row-2', roleId: ADMIN_ROLE_ID, tenantId: TENANT_ID, permission: 'CHANGE_ROLES_PERMISSIONS', enabled: true },
	{ id: 'row-3', roleId: EMPLOYEE_ROLE_ID, tenantId: TENANT_ID, permission: 'ADMIN_DASHBOARD_VIEW', enabled: false },
	{ id: 'row-4', roleId: EMPLOYEE_ROLE_ID, tenantId: TENANT_ID, permission: 'TIME_TRACKER', enabled: true }
];

/** Gauzy narrows the list on each `where` field it is given and returns every row without one. */
function matchesWhere(row: RolePermissionRow, where: GauzyWhere): boolean {
	const roleMatches = !where.roleId || row.roleId === where.roleId;
	const tenantMatches = !where.tenantId || row.tenantId === where.tenantId;
	return roleMatches && tenantMatches;
}

/** Gauzy's `GET /role-permissions`, as serverFetch resolves it. */
function gauzyList({ path }: { path: string }) {
	const [pathname, query] = path.split('?');
	if (pathname !== '/role-permissions') {
		return Promise.reject(new Error(`unexpected GET ${pathname}`));
	}
	const params = qs.parse(query) as { where?: GauzyWhere };
	const where = params.where ?? {};
	const items = ROWS.filter((row) => matchesWhere(row, where));
	return Promise.resolve({ data: { items, total: items.length } });
}

function rowsOf(roleId: string): RolePermissionRow[] {
	return ROWS.filter((row) => row.roleId === roleId);
}

afterEach(() => {
	jest.resetAllMocks();
});

describe('getRolePermissionsRequest', () => {
	it.each([
		['admin', ADMIN_ROLE_ID],
		['employee', EMPLOYEE_ROLE_ID]
	])('gets only the rows of the %s role from Gauzy', async (_label, roleId) => {
		mockServerFetch.mockImplementation(gauzyList);
		const expectedRows = rowsOf(roleId);

		const { data } = await getRolePermissionsRequest({ bearer_token: 'token-1', roleId, tenantId: TENANT_ID });

		expect(data).toEqual({ items: expectedRows, total: 2 });
	});

	it('filters the list on where[roleId] and where[tenantId] and still sends the data param', async () => {
		mockServerFetch.mockImplementation(gauzyList);

		await getRolePermissionsRequest({ bearer_token: 'token-1', roleId: EMPLOYEE_ROLE_ID, tenantId: TENANT_ID });

		const [options] = mockServerFetch.mock.calls[0];
		const [, query] = options.path.split('?');
		const params = qs.parse(query) as { where: GauzyWhere; data: string };
		const legacyData = JSON.parse(params.data);
		expect(options).toEqual(
			expect.objectContaining({ method: 'GET', bearer_token: 'token-1', tenantId: TENANT_ID })
		);
		expect(params.where).toEqual({ roleId: EMPLOYEE_ROLE_ID, tenantId: TENANT_ID });
		expect(legacyData).toEqual({ findInput: { roleId: EMPLOYEE_ROLE_ID, tenantId: TENANT_ID } });
	});
});
