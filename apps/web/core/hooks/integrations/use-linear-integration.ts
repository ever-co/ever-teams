'use client';

import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAtomValue } from 'jotai';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useOrganizationProjectsQuery } from '@/core/hooks/organizations/projects/use-organization-projects-query';
import { isLinearIntegrationEnabled } from '@/core/lib/utils/integration-linear-enabled';
import { queryKeys } from '@/core/query/keys';
import { ApiErrorService } from '@/core/services/client/api-error.service';
import { linearIntegrationService } from '@/core/services/client/api/integrations/linear.service';
import { activeTeamState } from '@/core/stores';
import {
	ILinearConnectionSummary,
	ILinearMapping,
	ILinearMappingInput,
	ILinearRun,
	ILinearTeam,
	LINEAR_CALLBACK_ERRORS,
	TLinearCallbackError
} from '@/core/types/interfaces/integrations/linear';

/** What the Linear provider shows. */
export type LinearConnectionStatus = 'hidden' | 'loading' | 'loadError' | 'notConfigured' | 'notConnected' | 'connected';

/** What is being changed right now (one thing at a time). */
export interface LinearPending {
	kind: 'connect' | 'disconnect' | 'create' | 'update' | 'remove' | 'import' | null;
	mappingId: string | null;
}

export interface LinearIntegrationProject {
	id: string;
	name: string;
}

export interface LinearIntegrationSettings {
	status: LinearConnectionStatus;
	readError: unknown;
	isRetrying: boolean;
	retry: () => void;
	connection: ILinearConnectionSummary | null;
	defaultStateMap: Record<string, string>;
	/** What the platform's callback sent the person back with. */
	callbackError: TLinearCallbackError | null;
	teams: ILinearTeam[];
	projects: LinearIntegrationProject[];
	mappings: ILinearMapping[];
	runs: ILinearRun[];
	isLoadingDetails: boolean;
	actionError: unknown;
	clearActionError: () => void;
	pending: LinearPending;
	connect: () => void;
	disconnect: () => Promise<void>;
	createMapping: (input: ILinearMappingInput) => Promise<void>;
	updateMapping: (mappingId: string, input: Partial<ILinearMappingInput>) => Promise<void>;
	removeMapping: (mappingId: string) => Promise<void>;
	importNow: (mappingId: string, full: boolean) => Promise<void>;
}

const NO_PENDING: LinearPending = { kind: null, mappingId: null };
const NO_TEAMS: ILinearTeam[] = [];
const NO_MAPPINGS: ILinearMapping[] = [];
const NO_RUNS: ILinearRun[] = [];
/** How often the runs are read again while one is running. */
const RUNS_POLL_MS = 10_000;

function isNotFound(error: unknown): boolean {
	if (ApiErrorService.isApiError(error)) return error.statusCode === 404 || error.hasHttpResponseStatus(404);
	return (error as { response?: { status?: number } } | null)?.response?.status === 404;
}

function isCallbackError(value: string | null): value is TLinearCallbackError {
	return !!value && (LINEAR_CALLBACK_ERRORS as readonly string[]).includes(value);
}

/** Sends this tab to the authorize page (a function so a test can replace it). */
export function leaveForLinear(url: string): void {
	window.location.assign(url);
}

/**
 * The Linear integration of the active team's organization, for the settings page: whether the platform offers
 * it (its plugin may be off, or the OAuth application missing), the connection, its team ↔ project mappings,
 * the organization's projects to map to, the latest runs, and the actions. The connect flow leaves the tab for
 * Linear; the platform's callback brings the person back to this page with `?integrationId=` or `?error=`.
 */
export function useLinearIntegration(): LinearIntegrationSettings {
	const queryClient = useQueryClient();
	const activeTeam = useAtomValue(activeTeamState);
	const searchParams = useSearchParams();
	const enabled = isLinearIntegrationEnabled();
	const tenantId = activeTeam?.tenantId ?? null;
	const organizationId = activeTeam?.organizationId ?? null;
	const [pending, setPending] = useState<LinearPending>(NO_PENDING);
	const [actionError, setActionError] = useState<unknown>(null);

	const callbackError = useMemo(() => {
		const value = searchParams?.get('error') ?? null;
		return isCallbackError(value) ? value : null;
	}, [searchParams]);

	const statusQuery = useQuery({
		queryKey: queryKeys.integrations.linear.status(tenantId, organizationId),
		queryFn: ({ signal }) => linearIntegrationService.status(organizationId as string, signal),
		enabled: enabled && !!organizationId,
		staleTime: 30_000,
		retry: (count, error) => !isNotFound(error) && count < 2
	});
	const connection = statusQuery.data?.connection ?? null;
	const integrationId = connection?.id ?? null;

	const mappingsQuery = useQuery({
		queryKey: queryKeys.integrations.linear.mappings(tenantId, organizationId, integrationId),
		queryFn: ({ signal }) => linearIntegrationService.mappings(integrationId as string, signal),
		enabled: !!integrationId,
		staleTime: 15_000
	});
	const teamsQuery = useQuery({
		queryKey: queryKeys.integrations.linear.teams(tenantId, organizationId, integrationId),
		queryFn: ({ signal }) => linearIntegrationService.teams(integrationId as string, signal),
		enabled: !!integrationId,
		staleTime: 5 * 60_000
	});
	const runsQuery = useQuery({
		queryKey: queryKeys.integrations.linear.runs(tenantId, organizationId, integrationId),
		queryFn: ({ signal }) => linearIntegrationService.runs(integrationId as string, 20, signal),
		enabled: !!integrationId,
		staleTime: 5_000,
		refetchInterval: (query) => (query.state.data?.some((run) => run.status === 'running') ? RUNS_POLL_MS : false)
	});
	const { organizationProjects } = useOrganizationProjectsQuery({ enabled: !!integrationId });
	const projects = useMemo<LinearIntegrationProject[]>(
		() => (organizationProjects ?? []).map((project) => ({ id: project.id, name: project.name ?? '' })).filter((project) => project.id),
		[organizationProjects]
	);

	const invalidate = useCallback(() => {
		void queryClient.invalidateQueries({ queryKey: queryKeys.integrations.linear.all });
	}, [queryClient]);

	/** One action at a time, its kind shown while it runs, its error kept for the page. */
	const act = useCallback(async (kind: LinearPending['kind'], mappingId: string | null, work: () => Promise<unknown>) => {
		setPending({ kind, mappingId });
		setActionError(null);
		try {
			await work();
			invalidate();
		} catch (error) {
			setActionError(error);
			throw error;
		} finally {
			setPending(NO_PENDING);
		}
	}, [invalidate]);

	const connectMutation = useMutation({
		mutationFn: () => linearIntegrationService.installState(organizationId as string),
		onMutate: () => {
			setPending({ kind: 'connect', mappingId: null });
			setActionError(null);
		},
		onSuccess: ({ authorizeUrl }) => leaveForLinear(authorizeUrl),
		onError: (error) => {
			setActionError(error);
			setPending(NO_PENDING);
		}
	});

	const connect = useCallback(() => {
		if (!organizationId || pending.kind) return;
		connectMutation.mutate();
	}, [connectMutation, organizationId, pending.kind]);

	const disconnect = useCallback(async () => {
		if (!integrationId) return;
		await act('disconnect', null, () => linearIntegrationService.disconnect(integrationId));
	}, [act, integrationId]);

	const createMapping = useCallback(
		async (input: ILinearMappingInput) => {
			if (!integrationId) return;
			await act('create', null, () => linearIntegrationService.createMapping(integrationId, input));
		},
		[act, integrationId]
	);

	const updateMapping = useCallback(
		async (mappingId: string, input: Partial<ILinearMappingInput>) => {
			if (!integrationId) return;
			await act('update', mappingId, () => linearIntegrationService.updateMapping(integrationId, mappingId, input));
		},
		[act, integrationId]
	);

	const removeMapping = useCallback(
		async (mappingId: string) => {
			if (!integrationId) return;
			await act('remove', mappingId, () => linearIntegrationService.removeMapping(integrationId, mappingId));
		},
		[act, integrationId]
	);

	const importNow = useCallback(
		async (mappingId: string, full: boolean) => {
			if (!integrationId) return;
			await act('import', mappingId, () => linearIntegrationService.importNow(integrationId, mappingId, full));
		},
		[act, integrationId]
	);

	const retry = useCallback(() => {
		void statusQuery.refetch();
	}, [statusQuery]);

	let status: LinearConnectionStatus = 'loading';
	if (!enabled) status = 'hidden';
	else if (!organizationId || statusQuery.isPending) status = 'loading';
	else if (statusQuery.isError) status = isNotFound(statusQuery.error) ? 'hidden' : 'loadError';
	else if (connection) status = 'connected';
	else if (!statusQuery.data?.configured) status = 'notConfigured';
	else status = 'notConnected';

	return {
		status,
		readError: statusQuery.error,
		isRetrying: statusQuery.isFetching,
		retry,
		connection,
		defaultStateMap: statusQuery.data?.defaultStateMap ?? {},
		callbackError,
		teams: teamsQuery.data ?? NO_TEAMS,
		projects,
		mappings: mappingsQuery.data ?? NO_MAPPINGS,
		runs: runsQuery.data ?? NO_RUNS,
		isLoadingDetails: !!integrationId && (mappingsQuery.isPending || teamsQuery.isPending),
		actionError,
		clearActionError: () => setActionError(null),
		pending: connectMutation.isPending ? { kind: 'connect', mappingId: null } : pending,
		connect,
		disconnect,
		createMapping,
		updateMapping,
		removeMapping,
		importNow
	};
}
