/**
 * @jest-environment node
 */
const mockAuthenticatedGuard = jest.fn();
const mockMyPermissions = jest.fn();
const mockCreate = jest.fn();
const mockCreateMany = jest.fn();
const mockClaim = jest.fn();
const mockPreview = jest.fn();
const mockMerge = jest.fn();

jest.mock('./guards/authenticated-guard-app', () => ({
	authenticatedGuard: (...args: unknown[]) => mockAuthenticatedGuard(...args)
}));
jest.mock('./requests/role-permissions', () => ({
	getMyRolePermissionsRequest: (...args: unknown[]) => mockMyPermissions(...args)
}));
jest.mock('./requests/employee-placeholder', () => ({
	createEmployeePlaceholderRequest: (...args: unknown[]) => mockCreate(...args),
	createEmployeePlaceholdersRequest: (...args: unknown[]) => mockCreateMany(...args),
	claimEmployeePlaceholderRequest: (...args: unknown[]) => mockClaim(...args),
	previewEmployeePlaceholderMergeRequest: (...args: unknown[]) => mockPreview(...args),
	mergeEmployeePlaceholderRequest: (...args: unknown[]) => mockMerge(...args)
}));

import { NextResponse } from 'next/server';
import {
	proxyClaimEmployeePlaceholder,
	proxyCreateEmployeePlaceholder,
	proxyCreateEmployeePlaceholders,
	proxyMergeEmployeePlaceholder,
	proxyPreviewEmployeePlaceholderMerge
} from './employee-placeholder-proxy';

const PLACEHOLDER_ID = '3db49a7e-69d2-471a-9495-3b69ece6fc54';

const SIGNED_IN = {
	$res: (data: unknown) => NextResponse.json(data, { status: 401 }),
	user: { id: 'admin-1' },
	access_token: 'session-token',
	tenantId: 'tenant-1',
	organizationId: 'organization-1'
};

const SESSION = { bearer_token: 'session-token', tenantId: 'tenant-1' };

function postJson(path: string, body: unknown) {
	return new Request(`https://app.ever.team${path}`, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(body)
	});
}

function allows(...permissions: string[]) {
	mockMyPermissions.mockResolvedValue({ data: permissions.map((permission) => ({ permission, enabled: true })) });
}

/** A Gauzy refusal, as serverFetch rejects it: a rejected promise holding the API's body. */
function gauzyRefusal(body: Record<string, unknown>) {
	const rejection = Promise.reject(body);
	rejection.catch(() => undefined);
	return rejection;
}

describe('employee-placeholder proxy routes', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockAuthenticatedGuard.mockResolvedValue(SIGNED_IN);
		allows('ORG_EMPLOYEES_EDIT');
	});

	it('creates a member without an account with the caller session and answers 201', async () => {
		mockCreate.mockResolvedValue({ data: { id: 'employee-amina', isPlaceholder: true } });
		const body = { tenantId: 'tenant-1', organizationId: 'organization-1', firstName: 'Amina' };

		const response = await proxyCreateEmployeePlaceholder(postJson('/api/employee-placeholder', body));

		expect(response.status).toBe(201);
		await expect(response.json()).resolves.toEqual({ id: 'employee-amina', isPlaceholder: true });
		expect(mockCreate).toHaveBeenCalledWith({ ...SESSION, body });
	});

	it('refuses, before Gauzy, a caller without ORG_EMPLOYEES_EDIT', async () => {
		allows('ORG_EMPLOYEES_VIEW');

		const create = await proxyCreateEmployeePlaceholder(postJson('/api/employee-placeholder', { firstName: 'A' }));
		const merge = await proxyMergeEmployeePlaceholder(
			postJson(`/api/employee-placeholder/${PLACEHOLDER_ID}/merge`, { targetEmployeeId: 'employee-ada' }),
			PLACEHOLDER_ID
		);

		expect(create.status).toBe(403);
		expect(merge.status).toBe(403);
		expect(mockCreate).not.toHaveBeenCalled();
		expect(mockMerge).not.toHaveBeenCalled();
	});

	it('refuses a caller without a session', async () => {
		mockAuthenticatedGuard.mockResolvedValue({ ...SIGNED_IN, user: null });

		const response = await proxyCreateEmployeePlaceholders(postJson('/api/employee-placeholder/bulk', {}));

		expect(response.status).toBe(401);
		expect(mockMyPermissions).not.toHaveBeenCalled();
	});

	it('refuses a body that is not an object, and an id that is not one', async () => {
		const badBody = await proxyCreateEmployeePlaceholder(postJson('/api/employee-placeholder', ['Amina']));
		const badId = await proxyClaimEmployeePlaceholder(
			postJson('/api/employee-placeholder/x/claim', { email: 'a@acme.com' }),
			'not-an-id'
		);

		expect(badBody.status).toBe(400);
		expect(badId.status).toBe(400);
		expect(mockAuthenticatedGuard).not.toHaveBeenCalled();
	});

	it("passes Gauzy's 409 on to the client unchanged", async () => {
		const refusal = {
			statusCode: 409,
			message: 'Both members have a time off balance with the same year (year 2026).'
		};
		mockMerge.mockReturnValue(gauzyRefusal(refusal));

		const response = await proxyMergeEmployeePlaceholder(
			postJson(`/api/employee-placeholder/${PLACEHOLDER_ID}/merge`, { targetEmployeeId: 'employee-ada' }),
			PLACEHOLDER_ID
		);

		expect(response.status).toBe(409);
		await expect(response.json()).resolves.toEqual(refusal);
	});

	it('sends the claim of the member the path names', async () => {
		mockClaim.mockResolvedValue({ data: { id: 'invite-1' } });
		const body = { tenantId: 'tenant-1', organizationId: 'organization-1', email: 'amina@acme.com' };

		const response = await proxyClaimEmployeePlaceholder(
			postJson(`/api/employee-placeholder/${PLACEHOLDER_ID}/claim`, body),
			PLACEHOLDER_ID
		);

		expect(response.status).toBe(201);
		expect(mockClaim).toHaveBeenCalledWith({ ...SESSION, placeholderId: PLACEHOLDER_ID, body });
	});

	it('reads a merge preview with only the query Gauzy takes', async () => {
		mockPreview.mockResolvedValue({ data: { timeLogs: 4 } });
		const url =
			`https://app.ever.team/api/employee-placeholder/${PLACEHOLDER_ID}/merge-preview` +
			'?tenantId=tenant-1&organizationId=organization-1&targetEmployeeId=employee-ada&relations=user';

		const response = await proxyPreviewEmployeePlaceholderMerge(new Request(url), PLACEHOLDER_ID);

		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual({ timeLogs: 4 });
		expect(mockPreview).toHaveBeenCalledWith({
			...SESSION,
			placeholderId: PLACEHOLDER_ID,
			query: 'tenantId=tenant-1&organizationId=organization-1&targetEmployeeId=employee-ada'
		});
	});
});
