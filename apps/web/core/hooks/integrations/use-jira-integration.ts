'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAtomValue } from 'jotai';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useOrganizationProjectsQuery } from '@/core/hooks/organizations/projects/use-organization-projects-query';
import { isJiraIntegrationEnabled } from '@/core/lib/utils/integration-jira-enabled';
import { queryKeys } from '@/core/query/keys';
import { jiraIntegrationService } from '@/core/services/client/api/integrations/jira.service';
import { activeTeamState } from '@/core/stores';
import {
	IJiraConnectionSummary,
	IJiraMapping,
	IJiraMappingInput,
	IJiraProject,
	IJiraProjectDetail,
	IJiraRun,
	IJiraSite,
	IJiraStatus,
	JIRA_CALLBACK_ERRORS,
	TJiraCallbackError
} from '@/core/types/interfaces/integrations/jira';
import {
	integrationProviderStatus,
	isNotFoundError,
	type IntegrationProviderStatus
} from './integration-provider-status';
import { useConflictsAfterRuns } from './use-integration-conflicts';

/** What the Jira provider shows. */
export type JiraConnectionStatus = IntegrationProviderStatus;

/** What is being changed right now (one thing at a time). */
export interface JiraPending {
	kind: 'connect' | 'disconnect' | 'site' | 'create' | 'update' | 'remove' | 'import' | 'webhook' | null;
	mappingId: string | null;
}

export interface JiraIntegrationProject {
	id: string;
	name: string;
}

export interface JiraIntegrationSettings {
	status: JiraConnectionStatus;
	readError: unknown;
	isRetrying: boolean;
	retry: () => void;
	connection: IJiraConnectionSummary | null;
	/** The connection's id, for the lookups the form makes (sites, projects, a project's statuses and issue types). */
	integrationId: string | null;
	/** Whether the platform takes Jira's webhooks (a public address is set there). */
	webhooks: boolean;
	/** The task status each status category becomes unless a mapping says otherwise. */
	defaultStatusMap: Record<string, string>;
	/** What the platform's callback sent the person back with (nothing once dismissed, or once a connection exists). */
	callbackError: TJiraCallbackError | null;
	/** Drops the callback error, from the page and from the address. */
	dismissCallbackError: () => void;
	projects: JiraIntegrationProject[];
	mappings: IJiraMapping[];
	/** Whether the mappings are known: while their read failed, nothing may be added (every project would look unmapped). */
	canManageMappings: boolean;
	runs: IJiraRun[];
	isLoadingDetails: boolean;
	/** A read of the mappings or the runs that failed (the connection itself answered). */
	detailsError: unknown;
	isRetryingDetails: boolean;
	retryDetails: () => void;
	/** The error of the last site, mapping, webhook or import action. */
	actionError: unknown;
	clearActionError: () => void;
	/** The error of the last disconnect, kept apart so the confirmation shows nothing else. */
	disconnectError: unknown;
	clearDisconnectError: () => void;
	pending: JiraPending;
	connect: () => void;
	disconnect: () => Promise<void>;
	selectSite: (cloudId: string) => Promise<void>;
	createMapping: (input: IJiraMappingInput) => Promise<void>;
	updateMapping: (mappingId: string, input: Partial<IJiraMappingInput>) => Promise<void>;
	removeMapping: (mappingId: string) => Promise<void>;
	registerWebhook: () => Promise<void>;
	importNow: (mappingId: string, full: boolean) => Promise<void>;
}

const NO_PENDING: JiraPending = { kind: null, mappingId: null };
const NO_MAPPINGS: IJiraMapping[] = [];
const NO_RUNS: IJiraRun[] = [];
const NO_SITES: IJiraSite[] = [];
const NO_JIRA_PROJECTS: IJiraProject[] = [];
const NO_DEFAULTS: Record<string, string> = {};
/** The organization's projects could not be read (the projects query keeps no error object). */
const PROJECTS_READ_FAILED = new Error('The organization projects could not be read');
/** How often the runs are read again while one is running. */
const RUNS_POLL_MS = 10_000;

function isCallbackError(value: string | null): value is TJiraCallbackError {
	return !!value && (JIRA_CALLBACK_ERRORS as readonly string[]).includes(value);
}

/** Sends this tab to the authorize page (a function so a test can replace it). */
export function leaveForJira(url: string): void {
	window.location.assign(url);
}

export interface JiraLookup<T> {
	items: T[];
	isLoading: boolean;
	error: unknown;
	retry: () => void;
}

/** The Jira Cloud sites the connection's token reaches, for the site choice (read only while it is shown). */
export function useJiraSites(integrationId: string | null): JiraLookup<IJiraSite> {
	const activeTeam = useAtomValue(activeTeamState);
	const query = useQuery({
		queryKey: queryKeys.integrations.jira.sites(activeTeam?.tenantId, activeTeam?.organizationId, integrationId),
		queryFn: ({ signal }) => jiraIntegrationService.sites(integrationId as string, signal),
		enabled: !!integrationId,
		staleTime: 60_000
	});
	const retry = useCallback(() => void query.refetch(), [query]);
	return {
		items: query.data ?? NO_SITES,
		isLoading: !!integrationId && query.isPending,
		error: query.error ?? null,
		retry
	};
}

/** The projects of the connection's site, for the add form (nothing until a site is chosen). */
export function useJiraProjects(integrationId: string | null, cloudId: string | null): JiraLookup<IJiraProject> {
	const activeTeam = useAtomValue(activeTeamState);
	const query = useQuery({
		queryKey: queryKeys.integrations.jira.projects(
			activeTeam?.tenantId,
			activeTeam?.organizationId,
			integrationId,
			cloudId
		),
		queryFn: ({ signal }) => jiraIntegrationService.projects(integrationId as string, signal),
		enabled: !!integrationId && !!cloudId,
		staleTime: 5 * 60_000
	});
	const retry = useCallback(() => void query.refetch(), [query]);
	return {
		items: query.data ?? NO_JIRA_PROJECTS,
		isLoading: !!integrationId && !!cloudId && query.isPending,
		error: query.error ?? null,
		retry
	};
}

export interface JiraProjectDetailLookup {
	detail: IJiraProjectDetail | null;
	isLoading: boolean;
	error: unknown;
	retry: () => void;
}

/** One Jira project's issue types and statuses, for a status map and an issue type filter. */
export function useJiraProjectDetail(
	integrationId: string | null,
	jiraProjectId: string | null
): JiraProjectDetailLookup {
	const activeTeam = useAtomValue(activeTeamState);
	const query = useQuery({
		queryKey: queryKeys.integrations.jira.project(
			activeTeam?.tenantId,
			activeTeam?.organizationId,
			integrationId,
			jiraProjectId
		),
		queryFn: ({ signal }) =>
			jiraIntegrationService.project(integrationId as string, jiraProjectId as string, signal),
		enabled: !!integrationId && !!jiraProjectId,
		staleTime: 5 * 60_000
	});
	const retry = useCallback(() => void query.refetch(), [query]);
	return {
		detail: query.data ?? null,
		isLoading: !!integrationId && !!jiraProjectId && query.isPending,
		error: query.error ?? null,
		retry
	};
}

/**
 * The Jira Cloud integration of the active team's organization, for the settings page: whether the platform offers
 * it (its sync may be off, or the OAuth app missing), the connection and its site, its Jira project ↔ project
 * mappings, the organization's projects to map to, the latest runs, and the actions. The connect flow leaves the tab
 * for Atlassian; the platform's callback brings the person back to this page with `?integrationId=` or `?error=`.
 */
export function useJiraIntegration(): JiraIntegrationSettings {
	const queryClient = useQueryClient();
	const activeTeam = useAtomValue(activeTeamState);
	const searchParams = useSearchParams();
	const router = useRouter();
	const pathname = usePathname();
	const enabled = isJiraIntegrationEnabled();
	const tenantId = activeTeam?.tenantId ?? null;
	const organizationId = activeTeam?.organizationId ?? null;
	const [pending, setPending] = useState<JiraPending>(NO_PENDING);
	const [actionError, setActionError] = useState<unknown>(null);
	const [disconnectError, setDisconnectError] = useState<unknown>(null);
	const [callbackDismissed, setCallbackDismissed] = useState(false);

	// The platform's callback names its provider (`?provider=jira`): another provider's return is not this one's.
	const callbackParam = useMemo(() => {
		if (searchParams?.get('provider') !== 'jira') return null;
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
		queryKey: queryKeys.integrations.jira.status(tenantId, organizationId),
		queryFn: ({ signal }) => jiraIntegrationService.status(organizationId as string, signal),
		enabled: enabled && !!organizationId,
		staleTime: 30_000,
		retry: (count, error) => !isNotFoundError(error) && count < 2
	});
	const connection = statusQuery.data?.connection ?? null;
	const integrationId = connection?.id ?? null;
	// A connection that exists makes a stale `?error=` moot (another tab connected since).
	const callbackError = callbackDismissed || connection ? null : callbackParam;

	const mappingsQuery = useQuery({
		queryKey: queryKeys.integrations.jira.mappings(tenantId, organizationId, integrationId),
		queryFn: ({ signal }) => jiraIntegrationService.mappings(integrationId as string, signal),
		enabled: !!integrationId,
		staleTime: 15_000
	});
	const runsQuery = useQuery({
		queryKey: queryKeys.integrations.jira.runs(tenantId, organizationId, integrationId),
		queryFn: ({ signal }) => jiraIntegrationService.runs(integrationId as string, 20, signal),
		enabled: !!integrationId,
		staleTime: 5_000,
		refetchInterval: (query) => (query.state.data?.some((run) => run.status === 'running') ? RUNS_POLL_MS : false)
	});
	const {
		organizationProjects,
		getOrganizationProjectsLoading,
		isOrganizationProjectsError,
		refetchOrganizationProjects
	} = useOrganizationProjectsQuery({ enabled: !!integrationId });
	const projects = useMemo<JiraIntegrationProject[]>(
		() =>
			organizationProjects
				.map((project) => ({ id: project.id, name: project.name ?? '' }))
				.filter((project) => project.id),
		[organizationProjects]
	);

	const invalidate = useCallback(() => {
		void queryClient.invalidateQueries({ queryKey: queryKeys.integrations.jira.all });
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
			void queryClient.invalidateQueries({
				queryKey: queryKeys.integrations.jira.mappings(tenantId, organizationId, integrationId)
			});
			void queryClient.invalidateQueries({
				queryKey: queryKeys.integrations.jira.status(tenantId, organizationId)
			});
		}
		wasRunning.current = isRunning;
	}, [acceptedFinished, integrationId, isRunning, organizationId, queryClient, runs, tenantId]);

	useConflictsAfterRuns('jira', runs);

	const retryDetails = useCallback(() => {
		if (mappingsQuery.isError) void mappingsQuery.refetch();
		if (runsQuery.isError) void runsQuery.refetch();
		if (isOrganizationProjectsError) void refetchOrganizationProjects();
	}, [isOrganizationProjectsError, mappingsQuery, refetchOrganizationProjects, runsQuery]);

	/** One action at a time, its kind shown while it runs, its error kept for the page (a disconnect's apart). */
	const act = useCallback(
		async (kind: JiraPending['kind'], mappingId: string | null, work: () => Promise<unknown>) => {
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
		},
		[invalidate]
	);

	/** The connection as an action answered it, in the status read at once (the refresh that follows confirms it). */
	const keepConnection = useCallback(
		(next: IJiraConnectionSummary | null | undefined) => {
			if (!next?.id) return;
			queryClient.setQueryData<IJiraStatus>(
				queryKeys.integrations.jira.status(tenantId, organizationId),
				(current) => (current ? { ...current, connection: next } : current)
			);
		},
		[organizationId, queryClient, tenantId]
	);

	const connectMutation = useMutation({
		mutationFn: () => jiraIntegrationService.installState(organizationId as string),
		onMutate: () => {
			setPending({ kind: 'connect', mappingId: null });
			setActionError(null);
		},
		onSuccess: ({ authorizeUrl }) => leaveForJira(authorizeUrl),
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
		await act('disconnect', null, () => jiraIntegrationService.disconnect(integrationId));
	}, [act, integrationId]);

	const selectSite = useCallback(
		async (cloudId: string) => {
			if (!integrationId) return;
			await act('site', null, async () =>
				keepConnection(await jiraIntegrationService.selectSite(integrationId, cloudId))
			);
		},
		[act, integrationId, keepConnection]
	);

	const createMapping = useCallback(
		async (input: IJiraMappingInput) => {
			if (!integrationId) return;
			await act('create', null, () => jiraIntegrationService.createMapping(integrationId, input));
		},
		[act, integrationId]
	);

	const updateMapping = useCallback(
		async (mappingId: string, input: Partial<IJiraMappingInput>) => {
			if (!integrationId) return;
			await act('update', mappingId, () => jiraIntegrationService.updateMapping(integrationId, mappingId, input));
		},
		[act, integrationId]
	);

	const removeMapping = useCallback(
		async (mappingId: string) => {
			if (!integrationId) return;
			await act('remove', mappingId, async () => {
				await jiraIntegrationService.removeMapping(integrationId, mappingId);
				// Gone from the list at once: the refresh that follows must not leave its buttons live meanwhile.
				queryClient.setQueryData<IJiraMapping[]>(
					queryKeys.integrations.jira.mappings(tenantId, organizationId, integrationId),
					(current) => current?.filter((mapping) => mapping.id !== mappingId)
				);
			});
		},
		[act, integrationId, organizationId, queryClient, tenantId]
	);

	// The platform registers the webhook before it answers, and answers the connection with its webhook as it now is.
	const registerWebhook = useCallback(async () => {
		if (!integrationId) return;
		await act('webhook', null, async () =>
			keepConnection((await jiraIntegrationService.registerWebhook(integrationId)).connection)
		);
	}, [act, integrationId, keepConnection]);

	const importNow = useCallback(
		async (mappingId: string, full: boolean) => {
			if (!integrationId) return;
			await act('import', mappingId, async () => {
				const { run } = await jiraIntegrationService.importNow(integrationId, mappingId, full);
				if (run?.id) acceptedRunIds.current.add(run.id);
			});
		},
		[act, integrationId]
	);

	const retry = useCallback(() => {
		void statusQuery.refetch();
	}, [statusQuery]);

	const status: JiraConnectionStatus = integrationProviderStatus({
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
		integrationId,
		webhooks: statusQuery.data?.webhooks ?? false,
		defaultStatusMap: statusQuery.data?.defaultStatusMap ?? NO_DEFAULTS,
		callbackError,
		dismissCallbackError,
		projects,
		mappings: mappingsQuery.data ?? NO_MAPPINGS,
		canManageMappings: !mappingsQuery.isError,
		runs,
		isLoadingDetails: !!integrationId && (mappingsQuery.isPending || getOrganizationProjectsLoading),
		detailsError:
			mappingsQuery.error ?? runsQuery.error ?? (isOrganizationProjectsError ? PROJECTS_READ_FAILED : null),
		isRetryingDetails: mappingsQuery.isFetching || runsQuery.isFetching,
		retryDetails,
		actionError,
		clearActionError: () => setActionError(null),
		disconnectError,
		clearDisconnectError: () => setDisconnectError(null),
		pending: connectMutation.isPending ? { kind: 'connect', mappingId: null } : pending,
		connect,
		disconnect,
		selectSite,
		createMapping,
		updateMapping,
		removeMapping,
		registerWebhook,
		importNow
	};
}
