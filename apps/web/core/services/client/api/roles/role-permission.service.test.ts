/**
 * The permissions page loads the selected role's rows with getRolePermission. In direct mode the browser calls
 * Gauzy, whose `GET /role-permissions/:id` reads the id of one row and answers 404 for a role id, so the role goes
 * in `where[roleId]` of the list route. In proxy mode this app's `/api/role-permissions/[id]` route takes the role
 * from the path.
 */
const mockTenantId = 'tenant-1';

jest.mock('@/core/lib/helpers/cookies', () => ({
	...jest.requireActual('@/core/lib/helpers/cookies'),
	getTenantIdCookie: () => mockTenantId
}));

import qs from 'qs';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { rolePermissionService } from './role-permission.service';

type RolePermissionRow = { id: string; roleId: string; tenantId: string; permission: string; enabled: boolean };
type GauzyWhere = { roleId?: string; tenantId?: string };

const ADMIN_ROLE_ID = '6f1c2a3b-4d5e-4f60-8a7b-1c2d3e4f5a01';
const EMPLOYEE_ROLE_ID = '6f1c2a3b-4d5e-4f60-8a7b-1c2d3e4f5a02';

/** Gauzy serves its list on both paths: `@Get(['/pagination', '/'])` in its role-permission controller. */
const GAUZY_LIST_PATHS = ['/role-permissions', '/role-permissions/pagination'];

function permissionRow(id: string, roleId: string, permission: string, enabled: boolean): RolePermissionRow {
	return { id, roleId, tenantId: mockTenantId, permission, enabled };
}

// The same permission is on for one role and off for the other, the case the page got wrong
const ROWS: RolePermissionRow[] = [
	permissionRow('9e8d7c6b-5a49-4382-9716-0a1b2c3d4e01', ADMIN_ROLE_ID, 'ADMIN_DASHBOARD_VIEW', true),
	permissionRow('9e8d7c6b-5a49-4382-9716-0a1b2c3d4e02', ADMIN_ROLE_ID, 'CHANGE_ROLES_PERMISSIONS', true),
	permissionRow('9e8d7c6b-5a49-4382-9716-0a1b2c3d4e03', EMPLOYEE_ROLE_ID, 'ADMIN_DASHBOARD_VIEW', false),
	permissionRow('9e8d7c6b-5a49-4382-9716-0a1b2c3d4e04', EMPLOYEE_ROLE_ID, 'TIME_TRACKER', true)
];

function rowsOf(roleId: string): RolePermissionRow[] {
	return ROWS.filter((row) => row.roleId === roleId);
}

/** Gauzy narrows the list on each `where` field it is given and returns every row without one. */
function matchesWhere(row: RolePermissionRow, where: GauzyWhere): boolean {
	const roleMatches = !where.roleId || row.roleId === where.roleId;
	const tenantMatches = !where.tenantId || row.tenantId === where.tenantId;
	return roleMatches && tenantMatches;
}

function okAnswer(data: unknown) {
	return { config: {}, data, headers: {}, status: 200, statusText: 'OK' };
}

/** Gauzy, in direct mode: its list filters on `where`, and any other path reads the id of one row. */
function gauzyAnswer(url: string) {
	const [pathname, query] = url.split('?');
	const isListPath = GAUZY_LIST_PATHS.includes(pathname);
	if (!isListPath) {
		return Promise.reject(new Error(`404 on GET ${pathname}: no role-permission row has that id`));
	}
	const params = qs.parse(query) as { where?: GauzyWhere };
	const where = params.where ?? {};
	const items = ROWS.filter((row) => matchesWhere(row, where));
	return Promise.resolve(okAnswer({ items, total: items.length }));
}

/** This app's `/api/role-permissions/[id]` route, in proxy mode: the rows of the role in the path. */
function proxyAnswer(url: string) {
	const [pathname] = url.split('?');
	const roleId = pathname.replace('/role-permissions/', '');
	const items = rowsOf(roleId);
	return Promise.resolve(okAnswer({ items, total: items.length }));
}

/** Direct mode is on when the deployment publishes Gauzy's URL to the browser; proxy mode publishes none. */
function publishApiUrl(url: string) {
	jest.spyOn(GAUZY_API_BASE_SERVER_URL, 'value', 'get').mockReturnValue(url);
}

function answerWith(answer: (url: string) => Promise<unknown>) {
	return jest.spyOn(rolePermissionService, 'get').mockImplementation((url: string) => answer(url) as never);
}

afterEach(() => {
	jest.restoreAllMocks();
});

describe('rolePermissionService.getRolePermission', () => {
	it.each([
		['admin', ADMIN_ROLE_ID],
		['employee', EMPLOYEE_ROLE_ID]
	])('loads only the rows of the %s role from Gauzy in direct mode', async (_label, roleId) => {
		publishApiUrl('https://api.example.org');
		answerWith(gauzyAnswer);
		const expectedRows = rowsOf(roleId);

		const result = await rolePermissionService.getRolePermission(roleId);

		expect(result).toEqual({ items: expectedRows, total: 2 });
	});

	it("filters Gauzy's list on where[roleId] and where[tenantId] in direct mode", async () => {
		publishApiUrl('https://api.example.org');
		const get = answerWith(gauzyAnswer);

		await rolePermissionService.getRolePermission(EMPLOYEE_ROLE_ID);

		const [url] = get.mock.calls[0];
		const [, query] = url.split('?');
		const params = qs.parse(query) as { where: GauzyWhere };
		expect(params.where).toEqual({ roleId: EMPLOYEE_ROLE_ID, tenantId: mockTenantId });
	});

	it.each([
		['admin', ADMIN_ROLE_ID],
		['employee', EMPLOYEE_ROLE_ID]
	])("asks this app's /api/role-permissions/[id] route for the %s role in proxy mode", async (_label, roleId) => {
		publishApiUrl('');
		const get = answerWith(proxyAnswer);
		const expectedRows = rowsOf(roleId);

		const result = await rolePermissionService.getRolePermission(roleId);

		const [url] = get.mock.calls[0];
		const [pathname] = url.split('?');
		expect(pathname).toBe(`/role-permissions/${roleId}`);
		expect(result).toEqual({ items: expectedRows, total: 2 });
	});
});
