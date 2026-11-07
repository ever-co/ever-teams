'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAtomValue } from 'jotai';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useOrganizationProjectsQuery } from '@/core/hooks/organizations/projects/use-organization-projects-query';
import { isTrelloIntegrationEnabled } from '@/core/lib/utils/integration-trello-enabled';
import { tokenOfHash } from '@/core/lib/utils/integration-trello-list-map';
import { queryKeys } from '@/core/query/keys';
import { ApiErrorService } from '@/core/services/client/api-error.service';
import { trelloIntegrationService } from '@/core/services/client/api/integrations/trello.service';
import { activeTeamState } from '@/core/stores';
import { ITrelloBoard, ITrelloConnectionSummary, ITrelloList, ITrelloMapping, ITrelloMappingInput, ITrelloRun } from '@/core/types/interfaces/integrations/trello';

/** What the Trello provider shows. */
export type TrelloConnectionStatus = 'hidden' | 'loading' | 'loadError' | 'notConfigured' | 'notConnected' | 'connected';

/** What is being changed right now (one thing at a time). */
export interface TrelloPending {
	kind: 'connect' | 'finish' | 'disconnect' | 'create' | 'update' | 'remove' | 'import' | 'webhook' | null;
	mappingId: string | null;
}

export interface TrelloIntegrationProject {
	id: string;
	name: string;
}

export interface TrelloIntegrationSettings {
	status: TrelloConnectionStatus;
	readError: unknown;
	isRetrying: boolean;
	retry: () => void;
	connection: ITrelloConnectionSummary | null;
	/** The connection's id, for the lookups the form makes (the lists of a board). */
	integrationId: string | null;
	/** Whether the platform takes Trello's webhooks (a public address and the application's secret are set there). */
	webhooks: boolean;
	/** Whether the return from Trello (the token in the address) is being handed to the platform. */
	isFinishing: boolean;
	/** What went wrong when the token Trello returned was handed to the platform (dismissible). */
	finishError: unknown;
	clearFinishError: () => void;
	/** Trello sent the person back without a token (they declined, or the return was cut short); dismissible. */
	returnRefused: boolean;
	clearReturnRefused: () => void;
	boards: ITrelloBoard[];
	projects: TrelloIntegrationProject[];
	mappings: ITrelloMapping[];
	/** Whether the mappings are known: while their read failed, nothing may be added (every board would look unmapped). */
	canManageMappings: boolean;
	runs: ITrelloRun[];
	isLoadingDetails: boolean;
	/** A read of the mappings, boards or runs that failed (the connection itself answered). */
	detailsError: unknown;
	isRetryingDetails: boolean;
	retryDetails: () => void;
	/** The error of the last mapping, webhook or import action. */
	actionError: unknown;
	clearActionError: () => void;
	/** The error of the last disconnect, kept apart so the confirmation shows nothing else. */
	disconnectError: unknown;
	clearDisconnectError: () => void;
	pending: TrelloPending;
	connect: () => void;
	disconnect: () => Promise<void>;
	createMapping: (input: ITrelloMappingInput) => Promise<void>;
	updateMapping: (mappingId: string, input: Partial<ITrelloMappingInput>) => Promise<void>;
	removeMapping: (mappingId: string) => Promise<void>;
	registerWebhook: (mappingId: string) => Promise<void>;
	importNow: (mappingId: string, full: boolean) => Promise<void>;
}

const NO_PENDING: TrelloPending = { kind: null, mappingId: null };
const NO_BOARDS: ITrelloBoard[] = [];
const NO_MAPPINGS: ITrelloMapping[] = [];
const NO_RUNS: ITrelloRun[] = [];
const NO_LISTS: ITrelloList[] = [];
/** How often the runs are read again while one is running. */
const RUNS_POLL_MS = 10_000;
/** How long after a webhook registration the mappings are read again (the platform registers behind its answer). */
const WEBHOOK_REREAD_MS = 3_000;
/** The organization's projects could not be read (the projects query keeps no error object). */
const PROJECTS_READ_FAILED = new Error('The organization projects could not be read');

function isNotFound(error: unknown): boolean {
	if (ApiErrorService.isApiError(error)) return error.statusCode === 404 || error.hasHttpResponseStatus(404);
	return (error as { response?: { status?: number } } | null)?.response?.status === 404;
}

/** Sends this tab to the authorize page (a function so a test can replace it). */
export function leaveForTrello(url: string): void {
	window.location.assign(url);
}

/** The fragment of the address (a function so a test can replace it). */
export function currentHash(): string {
	return typeof window === 'undefined' ? '' : window.location.hash;
}

export interface TrelloLookup<T> {
	items: T[];
	isLoading: boolean;
	error: unknown;
	retry: () => void;
}

/** The lists of one board, for a list map. */
export function useTrelloLists(integrationId: string | null, boardId: string | null): TrelloLookup<ITrelloList> {
	const activeTeam = useAtomValue(activeTeamState);
	const query = useQuery({
		queryKey: queryKeys.integrations.trello.lists(activeTeam?.tenantId, activeTeam?.organizationId, integrationId, boardId),
		queryFn: ({ signal }) => trelloIntegrationService.lists(integrationId as string, boardId as string, signal),
		enabled: !!integrationId && !!boardId,
		staleTime: 5 * 60_000
	});
	const retry = useCallback(() => void query.refetch(), [query]);
	return { items: query.data ?? NO_LISTS, isLoading: !!integrationId && !!boardId && query.isPending, error: query.error ?? null, retry };
}

/**
 * The Trello integration of the active team's organization, for the settings page: whether the platform offers
 * it (its plugin may be off, or the application's key missing), the connection, its board ↔ project mappings,
 * the boards the connection may see, the organization's projects to map to, the latest runs, and the actions.
 * The connect flow leaves the tab for Trello; Trello brings the person back to this page with the token in the
 * address's fragment (`#token=`) and the flow's state (`?provider=trello&state=`), which the hook hands to the
 * platform once and then drops from the address.
 */
export function useTrelloIntegration(): TrelloIntegrationSettings {
	const queryClient = useQueryClient();
	const activeTeam = useAtomValue(activeTeamState);
	const searchParams = useSearchParams();
	const router = useRouter();
	const pathname = usePathname();
	const enabled = isTrelloIntegrationEnabled();
	const tenantId = activeTeam?.tenantId ?? null;
	const organizationId = activeTeam?.organizationId ?? null;
	const [pending, setPending] = useState<TrelloPending>(NO_PENDING);
	const [actionError, setActionError] = useState<unknown>(null);
	const [disconnectError, setDisconnectError] = useState<unknown>(null);
	const [finishError, setFinishError] = useState<unknown>(null);
	const [returnRefused, setReturnRefused] = useState(false);

	const statusQuery = useQuery({
		queryKey: queryKeys.integrations.trello.status(tenantId, organizationId),
		queryFn: ({ signal }) => trelloIntegrationService.status(organizationId as string, signal),
		enabled: enabled && !!organizationId,
		staleTime: 30_000,
		retry: (count, error) => !isNotFound(error) && count < 2
	});
	const connection = statusQuery.data?.connection ?? null;
	const integrationId = connection?.id ?? null;

	// Trello's return: the token in the fragment, the state in the query. Dropped from the address either way.
	const stripReturn = useCallback(() => {
		const rest = new URLSearchParams(searchParams?.toString() ?? '');
		rest.delete('state');
		rest.delete('provider');
		const query = rest.toString();
		router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
	}, [pathname, router, searchParams]);

	const finishMutation = useMutation({
		mutationFn: ({ token, state }: { token: string; state: string }) => trelloIntegrationService.connect(organizationId as string, token, state),
		onMutate: () => {
			setFinishError(null);
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: queryKeys.integrations.trello.all });
		},
		onError: (error) => setFinishError(error),
		onSettled: () => stripReturn()
	});
	const finishedOnce = useRef(false);
	useEffect(() => {
		if (finishedOnce.current || !enabled || !organizationId) return;
		if (searchParams?.get('provider') !== 'trello') return;
		const state = searchParams.get('state');
		if (!state) return;
		finishedOnce.current = true;
		const token = tokenOfHash(currentHash());
		// Back from Trello without a token (`#error=…`, a declined authorization, a return cut short): said, and the
		// return fields dropped, rather than left in the address for a reload to meet again.
		if (!token) {
			setReturnRefused(true);
			stripReturn();
			return;
		}
		finishMutation.mutate({ token, state });
	}, [enabled, finishMutation, organizationId, searchParams, stripReturn]);

	const mappingsQuery = useQuery({
		queryKey: queryKeys.integrations.trello.mappings(tenantId, organizationId, integrationId),
		queryFn: ({ signal }) => trelloIntegrationService.mappings(integrationId as string, signal),
		enabled: !!integrationId,
		staleTime: 15_000
	});
	const metadataQuery = useQuery({
		queryKey: queryKeys.integrations.trello.metadata(tenantId, organizationId, integrationId),
		queryFn: ({ signal }) => trelloIntegrationService.metadata(integrationId as string, signal),
		enabled: !!integrationId,
		staleTime: 5 * 60_000
	});
	const runsQuery = useQuery({
		queryKey: queryKeys.integrations.trello.runs(tenantId, organizationId, integrationId),
		queryFn: ({ signal }) => trelloIntegrationService.runs(integrationId as string, 20, signal),
		enabled: !!integrationId,
		staleTime: 5_000,
		refetchInterval: (query) => (query.state.data?.some((run) => run.status === 'running') ? RUNS_POLL_MS : false)
	});
	const { organizationProjects, getOrganizationProjectsLoading, isOrganizationProjectsError, refetchOrganizationProjects } = useOrganizationProjectsQuery({ enabled: !!integrationId });
	const projects = useMemo<TrelloIntegrationProject[]>(
		() => (organizationProjects ?? []).map((project) => ({ id: project.id, name: project.name ?? '' })).filter((project) => project.id),
		[organizationProjects]
	);

	const invalidate = useCallback(() => {
		void queryClient.invalidateQueries({ queryKey: queryKeys.integrations.trello.all });
	}, [queryClient]);

	// A run that finished changed the mapping (its last import) and maybe the connection (an attention reason):
	// both are read again, since the poll refreshes the runs alone. Each run seen running is followed by id until it
	// is seen finished (or gone from the page), so one that ends while another still runs — two webhook runs that
	// overlap — refreshes them too, not only the moment every run has stopped. A run this page started is followed
	// from its accepted row, so a quick one whose finished row is the first seen refreshes them as well.
	const followedRunIds = useRef(new Set<string>());
	const runs = runsQuery.data ?? NO_RUNS;
	const finishedFollowed = runs.some((run) => followedRunIds.current.has(run.id) && run.status !== 'running');
	useEffect(() => {
		for (const run of runs) if (run.status === 'running') followedRunIds.current.add(run.id);
		const listed = new Set(runs.map((run) => run.id));
		const gone = [...followedRunIds.current].some((id) => !listed.has(id));
		if (finishedFollowed || gone) {
			for (const id of [...followedRunIds.current]) {
				const run = runs.find((candidate) => candidate.id === id);
				if (!run || run.status !== 'running') followedRunIds.current.delete(id);
			}
			void queryClient.invalidateQueries({ queryKey: queryKeys.integrations.trello.mappings(tenantId, organizationId, integrationId) });
			void queryClient.invalidateQueries({ queryKey: queryKeys.integrations.trello.status(tenantId, organizationId) });
		}
	}, [finishedFollowed, integrationId, organizationId, queryClient, runs, tenantId]);

	const retryDetails = useCallback(() => {
		if (mappingsQuery.isError) void mappingsQuery.refetch();
		if (metadataQuery.isError) void metadataQuery.refetch();
		if (runsQuery.isError) void runsQuery.refetch();
		if (isOrganizationProjectsError) void refetchOrganizationProjects();
	}, [isOrganizationProjectsError, mappingsQuery, metadataQuery, refetchOrganizationProjects, runsQuery]);

	/** One action at a time, its kind shown while it runs, its error kept for the page (a disconnect's apart). */
	const act = useCallback(async (kind: TrelloPending['kind'], mappingId: string | null, work: () => Promise<unknown>) => {
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
		mutationFn: () => trelloIntegrationService.installState(organizationId as string),
		onMutate: () => {
			setPending({ kind: 'connect', mappingId: null });
			setActionError(null);
		},
		onSuccess: ({ authorizeUrl }) => leaveForTrello(authorizeUrl),
		onError: (error) => {
			setActionError(error);
			setPending(NO_PENDING);
		}
	});

	const connect = useCallback(() => {
		if (!organizationId || pending.kind) return;
		setFinishError(null);
		connectMutation.mutate();
	}, [connectMutation, organizationId, pending.kind]);

	const disconnect = useCallback(async () => {
		if (!integrationId) return;
		await act('disconnect', null, () => trelloIntegrationService.disconnect(integrationId));
	}, [act, integrationId]);

	const createMapping = useCallback(
		async (input: ITrelloMappingInput) => {
			if (!integrationId) return;
			await act('create', null, () => trelloIntegrationService.createMapping(integrationId, input));
		},
		[act, integrationId]
	);

	const updateMapping = useCallback(
		async (mappingId: string, input: Partial<ITrelloMappingInput>) => {
			if (!integrationId) return;
			await act('update', mappingId, () => trelloIntegrationService.updateMapping(integrationId, mappingId, input));
		},
		[act, integrationId]
	);

	const removeMapping = useCallback(
		async (mappingId: string) => {
			if (!integrationId) return;
			await act('remove', mappingId, async () => {
				await trelloIntegrationService.removeMapping(integrationId, mappingId);
				// Gone from the list at once: the refresh that follows must not leave its buttons live meanwhile.
				queryClient.setQueryData<ITrelloMapping[]>(queryKeys.integrations.trello.mappings(tenantId, organizationId, integrationId), (current) =>
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
			await act('webhook', mappingId, () => trelloIntegrationService.registerWebhook(integrationId, mappingId));
			if (rereadTimer.current) clearTimeout(rereadTimer.current);
			rereadTimer.current = setTimeout(() => {
				rereadTimer.current = null;
				void queryClient.invalidateQueries({ queryKey: queryKeys.integrations.trello.mappings(tenantId, organizationId, integrationId) });
			}, WEBHOOK_REREAD_MS);
		},
		[act, integrationId, organizationId, queryClient, tenantId]
	);

	const importNow = useCallback(
		async (mappingId: string, full: boolean) => {
			if (!integrationId) return;
			await act('import', mappingId, async () => {
				const { run } = await trelloIntegrationService.importNow(integrationId, mappingId, full);
				if (run?.id) followedRunIds.current.add(run.id);
			});
		},
		[act, integrationId]
	);

	const retry = useCallback(() => {
		void statusQuery.refetch();
	}, [statusQuery]);

	let status: TrelloConnectionStatus = 'loading';
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
		isFinishing: finishMutation.isPending,
		finishError,
		clearFinishError: () => setFinishError(null),
		returnRefused,
		clearReturnRefused: () => setReturnRefused(false),
		boards: metadataQuery.data?.boards ?? NO_BOARDS,
		projects,
		mappings: mappingsQuery.data ?? NO_MAPPINGS,
		canManageMappings: !mappingsQuery.isError,
		runs,
		isLoadingDetails: !!integrationId && (mappingsQuery.isPending || metadataQuery.isPending || getOrganizationProjectsLoading),
		detailsError: mappingsQuery.error ?? metadataQuery.error ?? runsQuery.error ?? (isOrganizationProjectsError ? PROJECTS_READ_FAILED : null),
		isRetryingDetails: mappingsQuery.isFetching || metadataQuery.isFetching || runsQuery.isFetching,
		retryDetails,
		actionError,
		clearActionError: () => setActionError(null),
		disconnectError,
		clearDisconnectError: () => setDisconnectError(null),
		pending: connectMutation.isPending ? { kind: 'connect', mappingId: null } : finishMutation.isPending ? { kind: 'finish', mappingId: null } : pending,
		connect,
		disconnect,
		createMapping,
		updateMapping,
		removeMapping,
		registerWebhook,
		importNow
	};
}
