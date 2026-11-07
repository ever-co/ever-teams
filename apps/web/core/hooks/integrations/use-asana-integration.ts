'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAtomValue } from 'jotai';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useOrganizationProjectsQuery } from '@/core/hooks/organizations/projects/use-organization-projects-query';
import { isAsanaIntegrationEnabled } from '@/core/lib/utils/integration-asana-enabled';
import { queryKeys } from '@/core/query/keys';
import { ApiErrorService } from '@/core/services/client/api-error.service';
import { asanaIntegrationService } from '@/core/services/client/api/integrations/asana.service';
import { activeTeamState } from '@/core/stores';
import {
	ASANA_CALLBACK_ERRORS,
	IAsanaConnectionSummary,
	IAsanaMapping,
	IAsanaMappingInput,
	IAsanaProject,
	IAsanaRun,
	IAsanaSection,
	IAsanaWorkspace,
	TAsanaCallbackError
} from '@/core/types/interfaces/integrations/asana';

/** What the Asana provider shows. */
export type AsanaConnectionStatus = 'hidden' | 'loading' | 'loadError' | 'notConfigured' | 'notConnected' | 'connected';

/** What is being changed right now (one thing at a time). */
export interface AsanaPending {
	kind: 'connect' | 'disconnect' | 'create' | 'update' | 'remove' | 'import' | 'webhook' | null;
	mappingId: string | null;
}

export interface AsanaIntegrationProject {
	id: string;
	name: string;
}

export interface AsanaIntegrationSettings {
	status: AsanaConnectionStatus;
	readError: unknown;
	isRetrying: boolean;
	retry: () => void;
	connection: IAsanaConnectionSummary | null;
	/** The connection's id, for the lookups the form makes (projects of a workspace, sections of a project). */
	integrationId: string | null;
	/** Whether the platform takes Asana's webhooks (a public address is set there). */
	webhooks: boolean;
	/** What the platform's callback sent the person back with (nothing once dismissed, or once a connection exists). */
	callbackError: TAsanaCallbackError | null;
	/** Drops the callback error, from the page and from the address. */
	dismissCallbackError: () => void;
	workspaces: IAsanaWorkspace[];
	projects: AsanaIntegrationProject[];
	mappings: IAsanaMapping[];
	runs: IAsanaRun[];
	isLoadingDetails: boolean;
	/** A read of the mappings, workspaces or runs that failed (the connection itself answered). */
	detailsError: unknown;
	isRetryingDetails: boolean;
	retryDetails: () => void;
	/** The error of the last mapping, webhook or import action. */
	actionError: unknown;
	clearActionError: () => void;
	/** The error of the last disconnect, kept apart so the confirmation shows nothing else. */
	disconnectError: unknown;
	clearDisconnectError: () => void;
	pending: AsanaPending;
	connect: () => void;
	disconnect: () => Promise<void>;
	createMapping: (input: IAsanaMappingInput) => Promise<void>;
	updateMapping: (mappingId: string, input: Partial<IAsanaMappingInput>) => Promise<void>;
	removeMapping: (mappingId: string) => Promise<void>;
	registerWebhook: (mappingId: string) => Promise<void>;
	importNow: (mappingId: string, full: boolean) => Promise<void>;
}

const NO_PENDING: AsanaPending = { kind: null, mappingId: null };
const NO_WORKSPACES: IAsanaWorkspace[] = [];
const NO_MAPPINGS: IAsanaMapping[] = [];
const NO_RUNS: IAsanaRun[] = [];
const NO_ASANA_PROJECTS: IAsanaProject[] = [];
const NO_SECTIONS: IAsanaSection[] = [];
/** How often the runs are read again while one is running. */
const RUNS_POLL_MS = 10_000;
/** How long after a webhook registration the mappings are read again (the platform registers behind its answer). */
const WEBHOOK_REREAD_MS = 3_000;

function isNotFound(error: unknown): boolean {
	if (ApiErrorService.isApiError(error)) return error.statusCode === 404 || error.hasHttpResponseStatus(404);
	return (error as { response?: { status?: number } } | null)?.response?.status === 404;
}

function isCallbackError(value: string | null): value is TAsanaCallbackError {
	return !!value && (ASANA_CALLBACK_ERRORS as readonly string[]).includes(value);
}

/** Sends this tab to the authorize page (a function so a test can replace it). */
export function leaveForAsana(url: string): void {
	window.location.assign(url);
}

export interface AsanaLookup<T> {
	items: T[];
	isLoading: boolean;
	error: unknown;
	retry: () => void;
}

/** The (unarchived) projects of one Asana workspace, for the add form. */
export function useAsanaProjects(integrationId: string | null, workspaceGid: string | null): AsanaLookup<IAsanaProject> {
	const activeTeam = useAtomValue(activeTeamState);
	const query = useQuery({
		queryKey: queryKeys.integrations.asana.projects(activeTeam?.tenantId, activeTeam?.organizationId, integrationId, workspaceGid),
		queryFn: ({ signal }) => asanaIntegrationService.projects(integrationId as string, workspaceGid as string, signal),
		enabled: !!integrationId && !!workspaceGid,
		staleTime: 5 * 60_000
	});
	const retry = useCallback(() => void query.refetch(), [query]);
	return { items: query.data ?? NO_ASANA_PROJECTS, isLoading: !!integrationId && !!workspaceGid && query.isPending, error: query.error ?? null, retry };
}

/** The sections of one Asana project, for a section map. */
export function useAsanaSections(integrationId: string | null, projectGid: string | null): AsanaLookup<IAsanaSection> {
	const activeTeam = useAtomValue(activeTeamState);
	const query = useQuery({
		queryKey: queryKeys.integrations.asana.sections(activeTeam?.tenantId, activeTeam?.organizationId, integrationId, projectGid),
		queryFn: ({ signal }) => asanaIntegrationService.sections(integrationId as string, projectGid as string, signal),
		enabled: !!integrationId && !!projectGid,
		staleTime: 5 * 60_000
	});
	const retry = useCallback(() => void query.refetch(), [query]);
	return { items: query.data ?? NO_SECTIONS, isLoading: !!integrationId && !!projectGid && query.isPending, error: query.error ?? null, retry };
}

/**
 * The Asana integration of the active team's organization, for the settings page: whether the platform offers
 * it (its plugin may be off, or the OAuth application missing), the connection, its Asana project ↔ project
 * mappings, the workspaces the connection opens, the organization's projects to map to, the latest runs, and
 * the actions. The connect flow leaves the tab for Asana; the platform's callback brings the person back to
 * this page with `?integrationId=` or `?error=`.
 */
export function useAsanaIntegration(): AsanaIntegrationSettings {
	const queryClient = useQueryClient();
	const activeTeam = useAtomValue(activeTeamState);
	const searchParams = useSearchParams();
	const router = useRouter();
	const pathname = usePathname();
	const enabled = isAsanaIntegrationEnabled();
	const tenantId = activeTeam?.tenantId ?? null;
	const organizationId = activeTeam?.organizationId ?? null;
	const [pending, setPending] = useState<AsanaPending>(NO_PENDING);
	const [actionError, setActionError] = useState<unknown>(null);
	const [disconnectError, setDisconnectError] = useState<unknown>(null);
	const [callbackDismissed, setCallbackDismissed] = useState(false);

	const callbackParam = useMemo(() => {
		const value = searchParams?.get('error') ?? null;
		return isCallbackError(value) ? value : null;
	}, [searchParams]);

	// Dismissed, the `?error=` leaves the address too: a reload or a shared link must not bring it back.
	const dismissCallbackError = useCallback(() => {
		setCallbackDismissed(true);
		if (!searchParams?.has('error')) return;
		const rest = new URLSearchParams(searchParams.toString());
		rest.delete('error');
		const query = rest.toString();
		router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
	}, [pathname, router, searchParams]);

	const statusQuery = useQuery({
		queryKey: queryKeys.integrations.asana.status(tenantId, organizationId),
		queryFn: ({ signal }) => asanaIntegrationService.status(organizationId as string, signal),
		enabled: enabled && !!organizationId,
		staleTime: 30_000,
		retry: (count, error) => !isNotFound(error) && count < 2
	});
	const connection = statusQuery.data?.connection ?? null;
	const integrationId = connection?.id ?? null;
	// A connection that exists makes a stale `?error=` moot (another tab connected since).
	const callbackError = callbackDismissed || connection ? null : callbackParam;

	const mappingsQuery = useQuery({
		queryKey: queryKeys.integrations.asana.mappings(tenantId, organizationId, integrationId),
		queryFn: ({ signal }) => asanaIntegrationService.mappings(integrationId as string, signal),
		enabled: !!integrationId,
		staleTime: 15_000
	});
	const metadataQuery = useQuery({
		queryKey: queryKeys.integrations.asana.metadata(tenantId, organizationId, integrationId),
		queryFn: ({ signal }) => asanaIntegrationService.metadata(integrationId as string, signal),
		enabled: !!integrationId,
		staleTime: 5 * 60_000
	});
	const runsQuery = useQuery({
		queryKey: queryKeys.integrations.asana.runs(tenantId, organizationId, integrationId),
		queryFn: ({ signal }) => asanaIntegrationService.runs(integrationId as string, 20, signal),
		enabled: !!integrationId,
		staleTime: 5_000,
		refetchInterval: (query) => (query.state.data?.some((run) => run.status === 'running') ? RUNS_POLL_MS : false)
	});
	const { organizationProjects } = useOrganizationProjectsQuery({ enabled: !!integrationId });
	const projects = useMemo<AsanaIntegrationProject[]>(
		() => (organizationProjects ?? []).map((project) => ({ id: project.id, name: project.name ?? '' })).filter((project) => project.id),
		[organizationProjects]
	);

	const invalidate = useCallback(() => {
		void queryClient.invalidateQueries({ queryKey: queryKeys.integrations.asana.all });
	}, [queryClient]);

	// A run that was running and is not any more changed the mapping (its last import) and maybe the connection
	// (an attention reason): both are read again, since the poll refreshes the runs alone.
	const wasRunning = useRef(false);
	const isRunning = (runsQuery.data ?? NO_RUNS).some((run) => run.status === 'running');
	useEffect(() => {
		if (wasRunning.current && !isRunning) {
			void queryClient.invalidateQueries({ queryKey: queryKeys.integrations.asana.mappings(tenantId, organizationId, integrationId) });
			void queryClient.invalidateQueries({ queryKey: queryKeys.integrations.asana.status(tenantId, organizationId) });
		}
		wasRunning.current = isRunning;
	}, [integrationId, isRunning, organizationId, queryClient, tenantId]);

	const retryDetails = useCallback(() => {
		if (mappingsQuery.isError) void mappingsQuery.refetch();
		if (metadataQuery.isError) void metadataQuery.refetch();
		if (runsQuery.isError) void runsQuery.refetch();
	}, [mappingsQuery, metadataQuery, runsQuery]);

	/** One action at a time, its kind shown while it runs, its error kept for the page (a disconnect's apart). */
	const act = useCallback(async (kind: AsanaPending['kind'], mappingId: string | null, work: () => Promise<unknown>) => {
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
		mutationFn: () => asanaIntegrationService.installState(organizationId as string),
		onMutate: () => {
			setPending({ kind: 'connect', mappingId: null });
			setActionError(null);
		},
		onSuccess: ({ authorizeUrl }) => leaveForAsana(authorizeUrl),
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
		await act('disconnect', null, () => asanaIntegrationService.disconnect(integrationId));
	}, [act, integrationId]);

	const createMapping = useCallback(
		async (input: IAsanaMappingInput) => {
			if (!integrationId) return;
			await act('create', null, () => asanaIntegrationService.createMapping(integrationId, input));
		},
		[act, integrationId]
	);

	const updateMapping = useCallback(
		async (mappingId: string, input: Partial<IAsanaMappingInput>) => {
			if (!integrationId) return;
			await act('update', mappingId, () => asanaIntegrationService.updateMapping(integrationId, mappingId, input));
		},
		[act, integrationId]
	);

	const removeMapping = useCallback(
		async (mappingId: string) => {
			if (!integrationId) return;
			await act('remove', mappingId, async () => {
				await asanaIntegrationService.removeMapping(integrationId, mappingId);
				// Gone from the list at once: the refresh that follows must not leave its buttons live meanwhile.
				queryClient.setQueryData<IAsanaMapping[]>(queryKeys.integrations.asana.mappings(tenantId, organizationId, integrationId), (current) =>
					current?.filter((mapping) => mapping.id !== mappingId)
				);
			});
		},
		[act, integrationId, organizationId, queryClient, tenantId]
	);

	// The platform registers the webhook behind its answer: the mappings are read again a moment later.
	const rereadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	useEffect(() => () => {
		if (rereadTimer.current) clearTimeout(rereadTimer.current);
	}, []);
	const registerWebhook = useCallback(
		async (mappingId: string) => {
			if (!integrationId) return;
			await act('webhook', mappingId, () => asanaIntegrationService.registerWebhook(integrationId, mappingId));
			if (rereadTimer.current) clearTimeout(rereadTimer.current);
			rereadTimer.current = setTimeout(() => {
				rereadTimer.current = null;
				void queryClient.invalidateQueries({ queryKey: queryKeys.integrations.asana.mappings(tenantId, organizationId, integrationId) });
			}, WEBHOOK_REREAD_MS);
		},
		[act, integrationId, organizationId, queryClient, tenantId]
	);

	const importNow = useCallback(
		async (mappingId: string, full: boolean) => {
			if (!integrationId) return;
			await act('import', mappingId, () => asanaIntegrationService.importNow(integrationId, mappingId, full));
		},
		[act, integrationId]
	);

	const retry = useCallback(() => {
		void statusQuery.refetch();
	}, [statusQuery]);

	let status: AsanaConnectionStatus = 'loading';
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
		integrationId,
		webhooks: statusQuery.data?.webhooks ?? false,
		callbackError,
		dismissCallbackError,
		workspaces: metadataQuery.data?.workspaces ?? NO_WORKSPACES,
		projects,
		mappings: mappingsQuery.data ?? NO_MAPPINGS,
		runs: runsQuery.data ?? NO_RUNS,
		isLoadingDetails: !!integrationId && (mappingsQuery.isPending || metadataQuery.isPending),
		detailsError: mappingsQuery.error ?? metadataQuery.error ?? runsQuery.error ?? null,
		isRetryingDetails: mappingsQuery.isFetching || metadataQuery.isFetching || runsQuery.isFetching,
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
		registerWebhook,
		importNow
	};
}
