/** @jest-environment jsdom */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';

import type { TOrganizationProject } from '@/core/types/schemas';

const mockGetOrganizationProjects = jest.fn();
const mockRefetchProjects = jest.fn();

const LISTED_PROJECTS = [
	{ id: 'website', organizationContactId: 'acme', organizationContact: { id: 'acme', name: 'Acme' } },
	{ id: 'internal', organizationContactId: null, organizationContact: null }
] as unknown as TOrganizationProject[];

function projectsOf(isLoaded: boolean): TOrganizationProject[] {
	if (isLoaded) {
		return LISTED_PROJECTS;
	}
	return [];
}

function projectsQueryOf({ isLoaded = false, isError = false }: { isLoaded?: boolean; isError?: boolean }) {
	return {
		organizationProjects: projectsOf(isLoaded),
		isOrganizationProjectsLoaded: isLoaded,
		isOrganizationProjectsError: isError,
		refetchOrganizationProjects: mockRefetchProjects
	};
}

let mockProjectsQuery = projectsQueryOf({ isLoaded: true });

jest.mock('@/core/hooks/organizations/projects/use-organization-projects-query', () => ({
	useOrganizationProjectsQuery: () => mockProjectsQuery
}));
jest.mock('@/core/hooks/clients/use-clients-query', () => ({
	useActiveClients: () => ({ clients: [{ id: 'globex', name: 'Globex' }] })
}));
jest.mock('@/core/lib/helpers/cookies', () => ({
	getTenantIdCookie: () => 'tenant-a',
	getOrganizationIdCookie: () => 'organization-a'
}));
jest.mock('@/core/services/client/api/organizations', () => ({
	organizationProjectService: {
		getOrganizationProjects: (...args: unknown[]) => mockGetOrganizationProjects(...args)
	}
}));

import { useReportClientChoices, useReportProjectClients } from './use-report-clients';

const archivedProject = { id: 'old-site', organizationContactId: 'acme', organizationContact: null };

function wrapperOf() {
	const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	return ({ children }: PropsWithChildren) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useReportProjectClients', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockProjectsQuery = projectsQueryOf({ isLoaded: true });
		mockGetOrganizationProjects.mockResolvedValue({ items: [archivedProject], total: 1 });
	});

	it('tells the client of the listed projects without asking for anything more', () => {
		const options = { includesArchived: true, isEnabled: false };

		const { result } = renderHook(() => useReportProjectClients(options), { wrapper: wrapperOf() });

		expect(Object.fromEntries(result.current.clientIds)).toEqual({ website: 'acme', internal: null });
		expect(result.current.isPending).toBe(false);
		expect(mockGetOrganizationProjects).not.toHaveBeenCalled();
	});

	it('adds the archived projects once a client is picked, and waits for them', async () => {
		const options = { includesArchived: true, isEnabled: true };

		const { result } = renderHook(() => useReportProjectClients(options), { wrapper: wrapperOf() });

		expect(result.current.isPending).toBe(true);
		await waitFor(() => expect(result.current.isPending).toBe(false));
		expect(mockGetOrganizationProjects).toHaveBeenCalledWith(
			expect.objectContaining({ queries: { 'where[isArchived]': 'true' } })
		);
		expect(Object.fromEntries(result.current.clientIds)).toEqual({
			website: 'acme',
			internal: null,
			'old-site': 'acme'
		});
	});

	it('never reads the archived projects for a report that names the client beside each project', () => {
		const options = { includesArchived: false, isEnabled: true };

		const { result } = renderHook(() => useReportProjectClients(options), { wrapper: wrapperOf() });

		expect(result.current.isPending).toBe(false);
		expect(mockGetOrganizationProjects).not.toHaveBeenCalled();
	});

	it('waits while the projects are loading', () => {
		mockProjectsQuery = projectsQueryOf({ isLoaded: false });
		const options = { includesArchived: false, isEnabled: true };

		const { result } = renderHook(() => useReportProjectClients(options), { wrapper: wrapperOf() });

		expect(result.current.isPending).toBe(true);
		expect(result.current.isError).toBe(false);
	});

	it('says so when the projects cannot be read, and reads them again on retry', () => {
		mockProjectsQuery = projectsQueryOf({ isError: true });
		const options = { includesArchived: false, isEnabled: true };

		const { result } = renderHook(() => useReportProjectClients(options), { wrapper: wrapperOf() });
		result.current.refetch();

		expect(result.current.isError).toBe(true);
		expect(result.current.canTellClients).toBe(false);
		expect(result.current.isPending).toBe(false);
		expect(mockRefetchProjects).toHaveBeenCalledTimes(1);
	});

	it('fails when the archived projects cannot be read, rather than calling their time client-less', async () => {
		mockGetOrganizationProjects.mockRejectedValue(new Error('unreachable'));
		const options = { includesArchived: true, isEnabled: true };

		const { result } = renderHook(() => useReportProjectClients(options), { wrapper: wrapperOf() });

		await waitFor(() => expect(result.current.isError).toBe(true));
		expect(result.current.canTellClients).toBe(true);
	});
});

describe('useReportClientChoices', () => {
	it('offers the active clients and the ones only a project names, by name', () => {
		const { result } = renderHook(() => useReportClientChoices(LISTED_PROJECTS), { wrapper: wrapperOf() });

		expect(result.current).toEqual([
			{ id: 'acme', name: 'Acme' },
			{ id: 'globex', name: 'Globex' }
		]);
	});
});
