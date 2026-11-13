import qs from 'qs';
import type { TClient } from '@/core/types/schemas';

const mockCookieScope = { organizationId: 'organization-1', tenantId: 'tenant-1' };

jest.mock('@/core/lib/helpers/cookies', () => ({
	...jest.requireActual('@/core/lib/helpers/cookies'),
	getOrganizationIdCookie: () => mockCookieScope.organizationId,
	getTenantIdCookie: () => mockCookieScope.tenantId
}));

import { organizationContactService } from './organization-contact.service';

function clientsFrom(first: number, count: number): TClient[] {
	return Array.from({ length: count }, (_, index) => {
		const number = first + index;
		return { id: `client-${number}`, name: `Client ${number}` };
	});
}

function queryOf(url: unknown): Record<string, unknown> {
	return qs.parse(String(url).split('?')[1] ?? '');
}

describe('reading the clients of an organization, a page at a time', () => {
	afterEach(() => {
		jest.restoreAllMocks();
		mockCookieScope.organizationId = 'organization-1';
		mockCookieScope.tenantId = 'tenant-1';
	});

	it('asks every page of the organization the read started in, even when another one is chosen meanwhile', async () => {
		const get = jest
			.spyOn(organizationContactService, 'get')
			.mockImplementationOnce(async () => {
				// A team of another organization is chosen while the first page is read
				mockCookieScope.organizationId = 'organization-2';
				mockCookieScope.tenantId = 'tenant-2';
				return { data: { items: clientsFrom(1, 100), total: 150 } } as never;
			})
			.mockResolvedValueOnce({ data: { items: clientsFrom(101, 50), total: 150 } } as never);

		const clients = await organizationContactService.getClients();

		expect(clients).toHaveLength(150);
		const scopes = get.mock.calls.map(([url]) => queryOf(url).where);
		const firstScope = { organizationId: 'organization-1', tenantId: 'tenant-1', contactType: 'CLIENT' };
		expect(scopes).toEqual([firstScope, firstScope]);
		const tenantHeaders = get.mock.calls.map(([, config]) => config?.tenantId);
		expect(tenantHeaders).toEqual(['tenant-1', 'tenant-1']);
	});
});
