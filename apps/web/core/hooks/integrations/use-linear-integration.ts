'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAtomValue } from 'jotai';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useOrganizationProjectsQuery } from '@/core/hooks/organizations/projects/use-organization-projects-query';
import { LinearStatusOption } from '@/core/lib/utils/integration-linear-state-map';
import { isLinearIntegrationEnabled } from '@/core/lib/utils/integration-linear-enabled';
import { queryKeys } from '@/core/query/keys';
import { linearIntegrationService } from '@/core/services/client/api/integrations/linear.service';
import { taskStatusService } from '@/core/services/client/api/tasks/task-status.service';
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
import type { TaskMetadataScope } from '@/core/types/interfaces/task/task-metadata-bootstrap';
import { integrationProviderStatus, isNotFoundError, type IntegrationProviderStatus } from './integration-provider-status';
import { useConflictsAfterRuns } from './use-integration-conflicts';

/** What the Linear provider shows. */
export type LinearConnectionStatus = IntegrationProviderStatus;

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
	/** What the platform's callback sent the person back with (nothing once dismissed, or once a connection exists). */
	callbackError: TLinearCallbackError | null;
	/** Drops the callback error, from the page and from the address. */
	dismissCallbackError: () => void;
	teams: ILinearTeam[];
	projects: LinearIntegrationProject[];
	mappings: ILinearMapping[];
	/** Whether the mappings are known: while their read failed, nothing may be added (every team would look unmapped). */
	canManageMappings: boolean;
	runs: ILinearRun[];
	isLoadingDetails: boolean;
	/** A read of the mappings, teams or runs that failed (the connection itself answered). */
	detailsError: unknown;
	isRetryingDetails: boolean;
	retryDetails: () => void;
	/** The error of the last mapping or import action. */
	actionError: unknown;
	clearActionError: () => void;
	/** The error of the last disconnect, kept apart so the confirmation shows nothing else. */
	disconnectError: unknown;
	clearDisconnectError: () => void;
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
/** The organization's projects could not be read (the projects query keeps no error object). */
const PROJECTS_READ_FAILED = new Error('The organization projects could not be read');
/** How often the runs are read again while one is running. */
const RUNS_POLL_MS = 10_000;

function isCallbackError(value: string | null): value is TLinearCallbackError {
	return !!value && (LINEAR_CALLBACK_ERRORS as readonly string[]).includes(value);
}

/** Sends this tab to the authorize page (a function so a test can replace it). */
export function leaveForLinear(url: string): void {
	window.location.assign(url);
}

export interface LinearStatusOptions {
	/** The statuses a state may map to: the project's own, then the organization's (one entry per name). */
	options: LinearStatusOption[];
	isLoading: boolean;
	error: unknown;
	retry: () => void;
}

const NO_STATUS_OPTIONS: LinearStatusOption[] = [];

/**
 * The task statuses a mapping's state map may name: the project's own and the organization's, as the platform's
 * import resolves them (by name, a project's own first). The state map editors validate against this list.
 */
export function useLinearStatusOptions(projectId: string | null): LinearStatusOptions {
	const activeTeam = useAtomValue(activeTeamState);
	const tenantId = activeTeam?.tenantId ?? '';
	const organizationId = activeTeam?.organizationId ?? '';
	const scope = useMemo<TaskMetadataScope | null>(() => (tenantId && organizationId ? { tenantId, organizationId } : null), [organizationId, tenantId]);
	const organizationQuery = useQuery({
		queryKey: queryKeys.taskStatuses.byScope({ tenantId, organizationId }),
		queryFn: ({ signal }) => taskStatusService.getTaskStatuses(scope as TaskMetadataScope, signal),
		enabled: !!scope,
		staleTime: 60_000,
		select: (page) => page.items
	});
	const projectQuery = useQuery({
		queryKey: queryKeys.taskStatuses.byScope({ tenantId, organizationId, projectId: projectId ?? undefined }),
		queryFn: ({ signal }) => taskStatusService.getTaskStatuses({ ...(scope as TaskMetadataScope), projectId: projectId as string }, signal),
		enabled: !!scope && !!projectId,
		staleTime: 60_000,
		select: (page) => page.items
	});
	const options = useMemo<LinearStatusOption[]>(() => {
		const seen = new Set<string>();
		const result: LinearStatusOption[] = [];
		for (const status of [...(projectId ? (projectQuery.data ?? []) : []), ...(organizationQuery.data ?? [])]) {
			const name = String(status.name ?? '').trim();
			const key = name.toLowerCase();
			if (!key || seen.has(key)) continue;
			seen.add(key);
			result.push({ name });
		}
		return result.length ? result : NO_STATUS_OPTIONS;
	}, [organizationQuery.data, projectId, projectQuery.data]);
	const retry = useCallback(() => {
		if (organizationQuery.isError) void organizationQuery.refetch();
		if (projectQuery.isError) void projectQuery.refetch();
	}, [organizationQuery, projectQuery]);
	return {
		options,
		isLoading: !!scope && (organizationQuery.isPending || (!!projectId && projectQuery.isPending)),
		error: organizationQuery.error ?? (projectId ? projectQuery.error : null) ?? null,
		retry
	};
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
	const router = useRouter();
	const pathname = usePathname();
	const enabled = isLinearIntegrationEnabled();
	const tenantId = activeTeam?.tenantId ?? null;
	const organizationId = activeTeam?.organizationId ?? null;
	const [pending, setPending] = useState<LinearPending>(NO_PENDING);
	const [actionError, setActionError] = useState<unknown>(null);
	const [disconnectError, setDisconnectError] = useState<unknown>(null);
	const [callbackDismissed, setCallbackDismissed] = useState(false);

	// The platform's callback names its provider (`?provider=linear`); one that sends none is taken as this one.
	const callbackParam = useMemo(() => {
		const provider = searchParams?.get('provider');
		if (provider && provider !== 'linear') return null;
		const value = searchParams?.get('error') ?? null;
		return isCallbackError(value) ? value : null;
	}, [searchParams]);

	// Dismissed, the `?error=` leaves the address too: a reload or a shared link must not bring it back.
	const dismissCallbackError = useCallback(() => {
		setCallbackDismissed(true);
		if (!searchParams?.has('error')) return;
		const rest = new URLSearchParams(searchParams.toString());
		rest.delete('error');
		rest.delete('provider');
		const query = rest.toString();
		router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
	}, [pathname, router, searchParams]);

	const statusQuery = useQuery({
		queryKey: queryKeys.integrations.linear.status(tenantId, organizationId),
		queryFn: ({ signal }) => linearIntegrationService.status(organizationId as string, signal),
		enabled: enabled && !!organizationId,
		staleTime: 30_000,
		retry: (count, error) => !isNotFoundError(error) && count < 2
	});
	const connection = statusQuery.data?.connection ?? null;
	const integrationId = connection?.id ?? null;
	// A connection that exists makes a stale `?error=` moot (another tab connected since).
	const callbackError = callbackDismissed || connection ? null : callbackParam;

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
	const { organizationProjects, getOrganizationProjectsLoading, isOrganizationProjectsError, refetchOrganizationProjects } = useOrganizationProjectsQuery({ enabled: !!integrationId });
	const projects = useMemo<LinearIntegrationProject[]>(
		() => organizationProjects.map((project) => ({ id: project.id, name: project.name ?? '' })).filter((project) => project.id),
		[organizationProjects]
	);

	const invalidate = useCallback(() => {
		void queryClient.invalidateQueries({ queryKey: queryKeys.integrations.linear.all });
	}, [queryClient]);

	// A run that finished changed the mapping (its last import) and maybe the connection (an attention reason):
	// both are read again, since the poll refreshes the runs alone. A run this page started is tracked by id, so a
	// quick one whose finished row is the first seen refreshes them too.
	const wasRunning = useRef(false);
	const acceptedRunIds = useRef(new Set<string>());
	const runs = runsQuery.data ?? NO_RUNS;
	const isRunning = runs.some((run) => run.status === 'running');
	const acceptedFinished = runs.some((run) => acceptedRunIds.current.has(run.id) && run.status !== 'running');
	useEffect(() => {
		if ((wasRunning.current && !isRunning) || acceptedFinished) {
			for (const run of runs) if (run.status !== 'running') acceptedRunIds.current.delete(run.id);
			void queryClient.invalidateQueries({ queryKey: queryKeys.integrations.linear.mappings(tenantId, organizationId, integrationId) });
			void queryClient.invalidateQueries({ queryKey: queryKeys.integrations.linear.status(tenantId, organizationId) });
		}
		wasRunning.current = isRunning;
	}, [acceptedFinished, integrationId, isRunning, organizationId, queryClient, runs, tenantId]);

	useConflictsAfterRuns('linear', runs);

	const retryDetails = useCallback(() => {
		if (mappingsQuery.isError) void mappingsQuery.refetch();
		if (teamsQuery.isError) void teamsQuery.refetch();
		if (runsQuery.isError) void runsQuery.refetch();
		if (isOrganizationProjectsError) void refetchOrganizationProjects();
	}, [isOrganizationProjectsError, mappingsQuery, refetchOrganizationProjects, runsQuery, teamsQuery]);

	/** One action at a time, its kind shown while it runs, its error kept for the page (a disconnect's apart). */
	const act = useCallback(async (kind: LinearPending['kind'], mappingId: string | null, work: () => Promise<unknown>) => {
		const keepError = kind === 'disconnect' ? setDisconnectError : setActionError;
		setPending({ kind, mappingId });
		keepError(null);
		try {
			await work();
			invalidate();
		} catch (error) {
			keepError(error);
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
		if (callbackParam) dismissCallbackError();
		connectMutation.mutate();
	}, [callbackParam, connectMutation, dismissCallbackError, organizationId, pending.kind]);

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
			await act('remove', mappingId, async () => {
				await linearIntegrationService.removeMapping(integrationId, mappingId);
				// Gone from the list at once: the refresh that follows must not leave its buttons live meanwhile.
				queryClient.setQueryData<ILinearMapping[]>(queryKeys.integrations.linear.mappings(tenantId, organizationId, integrationId), (current) =>
					current?.filter((mapping) => mapping.id !== mappingId)
				);
			});
		},
		[act, integrationId, organizationId, queryClient, tenantId]
	);

	const importNow = useCallback(
		async (mappingId: string, full: boolean) => {
			if (!integrationId) return;
			await act('import', mappingId, async () => {
				const { run } = await linearIntegrationService.importNow(integrationId, mappingId, full);
				if (run?.id) acceptedRunIds.current.add(run.id);
			});
		},
		[act, integrationId]
	);

	const retry = useCallback(() => {
		void statusQuery.refetch();
	}, [statusQuery]);

	const status: LinearConnectionStatus = integrationProviderStatus({
		enabled,
		organizationId,
		isPending: statusQuery.isPending,
		isError: statusQuery.isError,
		error: statusQuery.error,
		configured: !!statusQuery.data?.configured,
		connected: !!connection
	});

	return {
		status,
		readError: statusQuery.error,
		isRetrying: statusQuery.isFetching,
		retry,
		connection,
		defaultStateMap: statusQuery.data?.defaultStateMap ?? {},
		callbackError,
		dismissCallbackError,
		teams: teamsQuery.data ?? NO_TEAMS,
		projects,
		mappings: mappingsQuery.data ?? NO_MAPPINGS,
		canManageMappings: !mappingsQuery.isError,
		runs,
		isLoadingDetails: !!integrationId && (mappingsQuery.isPending || teamsQuery.isPending || getOrganizationProjectsLoading),
		detailsError: mappingsQuery.error ?? teamsQuery.error ?? runsQuery.error ?? (isOrganizationProjectsError ? PROJECTS_READ_FAILED : null),
		isRetryingDetails: mappingsQuery.isFetching || teamsQuery.isFetching || runsQuery.isFetching,
		retryDetails,
		actionError,
		clearActionError: () => setActionError(null),
		disconnectError,
		clearDisconnectError: () => setDisconnectError(null),
		pending: connectMutation.isPending ? { kind: 'connect', mappingId: null } : pending,
		connect,
		disconnect,
		createMapping,
		updateMapping,
		removeMapping,
		importNow
	};
}
