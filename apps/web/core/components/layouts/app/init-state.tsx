import { useTimer } from '@/core/hooks/activities';
import { useTimerPolling } from '@/core/hooks/activities/use-timer-polling';
import { useWorkspaces } from '@/core/hooks/auth';
import { useReactiveAccessTokenCookie } from '@/core/hooks/auth/use-reactive-access-token-cookie';
import { useIsomorphicLayoutEffect } from '@/core/hooks/common/use-isomorphic-layout-effect';
import { useOrganizationTeamsQuery, useTeamTasksQuery } from '@/core/hooks/organizations';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { useAutoAssignTask, useTaskStatistics } from '@/core/hooks/tasks';
import { useStaleTimerGuard, useTimerRunningPastMidnight } from '@/core/hooks/timer/use-stale-timer-guard';
import { DISABLE_AUTO_REFRESH, TEAM_PRESENCE_REFRESH_INTERVAL } from '@/core/constants/config/constants';
import { activeTeamState, teamPresenceViewCountState } from '@/core/stores/teams/organization-team';
import { useQueryClient } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { useEffect, useMemo, useRef } from 'react';
import { reownActiveQueriesAfterTokenRefresh } from './token-refresh-query-ownership';
import { syncTokenOrganization } from '@/core/lib/auth/token-organization';
import { queryKeys } from '@/core/query/keys';
import { getShellCriticalQueryKeys, useScopeTransitionGuard } from './use-scope-transition-guard';

const SHELL_REFRESH_INTERVAL = 60_000;

// Team detail cadence: faster with a refresh on tab return while a team view is mounted, off without auto refresh.
function getTeamDetailRefresh(
	autoRefreshEnabled: boolean,
	teamPresenceViewActive: boolean
): { interval: number | false; onWindowFocus: boolean } {
	if (!autoRefreshEnabled) return { interval: false, onWindowFocus: false };
	return {
		interval: teamPresenceViewActive ? TEAM_PRESENCE_REFRESH_INTERVAL : SHELL_REFRESH_INTERVAL,
		onWindowFocus: teamPresenceViewActive
	};
}

export function AppState() {
	const { data: user } = useUserQuery();
	return <>{user && <InitState />}</>;
}

export function InitState() {
	const { data: user } = useUserQuery();
	const { currentWorkspace, workspacesQuery } = useWorkspaces();
	const accessToken = useReactiveAccessTokenCookie();
	const queryClient = useQueryClient();
	const tenantId = user?.employee?.tenantId ?? user?.tenantId ?? null;
	const organizationId = user?.employee?.organizationId ?? null;
	const workspaceReady = !!(
		user?.id &&
		accessToken &&
		tenantId &&
		organizationId &&
		workspacesQuery.isSuccess &&
		currentWorkspace
	);
	// Each new token (sign-in, refresh) and each active team must keep the token in the organization the app acts in
	// (the organization cookie): Gauzy confines a non-admin to the token's organization (token-organization.ts)
	const activeTeamOrganizationId = useAtomValue(activeTeamState)?.organizationId;
	useEffect(() => {
		let current = true;
		void syncTokenOrganization().then((switched) => {
			if (switched && current) queryClient.invalidateQueries({ queryKey: queryKeys.users.me });
		});
		return () => {
			current = false;
		};
	}, [accessToken, activeTeamOrganizationId, queryClient]);
	const autoRefreshEnabled = !DISABLE_AUTO_REFRESH.value;
	const shellRefreshInterval = autoRefreshEnabled ? SHELL_REFRESH_INTERVAL : false;
	const baseScope = useMemo(
		() => ({
			tenantId,
			organizationId,
			userId: user?.id ?? null,
			accessToken
		}),
		[accessToken, organizationId, tenantId, user?.id]
	);
	const teamPresenceViewActive = useAtomValue(teamPresenceViewCountState) > 0;
	const teamDetailRefresh = getTeamDetailRefresh(autoRefreshEnabled, teamPresenceViewActive);
	const teamOwner = useOrganizationTeamsQuery({
		enabled: workspaceReady,
		scope: baseScope,
		refetchInterval: shellRefreshInterval,
		detailRefetchInterval: teamDetailRefresh.interval,
		detailRefetchOnWindowFocus: teamDetailRefresh.onWindowFocus
	});
	const { activeTeam, teams } = teamOwner;
	// The list already resolves the team with its projects and plan policy. The detail only adds member work
	// statistics, so team-scoped reads start alongside it instead of one round trip after it.
	const teamReady = !!(workspaceReady && teamOwner.organizationTeamsSuccess && activeTeam?.id);
	const projectId = activeTeam?.projects?.[0]?.id ?? null;
	const teamScope = useMemo(
		() => ({
			...baseScope,
			teamId: activeTeam?.id ?? null
		}),
		[activeTeam?.id, baseScope]
	);
	const tasksOwner = useTeamTasksQuery({
		enabled: teamReady,
		scope: teamScope,
		refetchInterval: shellRefreshInterval
	});
	const timerOwner = useTimer({
		enabled: teamReady,
		scope: teamScope,
		statusEnabled: teamReady,
		statusRefetchInterval: shellRefreshInterval,
		plansEnabled: Boolean(activeTeam?.requirePlanToTrack),
		plansRefetchInterval: autoRefreshEnabled ? 5 * SHELL_REFRESH_INTERVAL : false,
		manageRuntime: false
	});

	const timerActivatedRef = useRef(false);
	useEffect(() => {
		if (teamReady && !timerActivatedRef.current) {
			timerActivatedRef.current = true;
			timerOwner.firstLoadTimerData();
		}
	}, [teamReady, timerOwner.firstLoadTimerData]);

	const staleTimerChecked = useStaleTimerGuard(user?.employee, workspaceReady);
	const timerRunning = useTimerRunningPastMidnight(
		user?.employee,
		timerOwner.rawTimerRunning,
		teamReady && staleTimerChecked && timerOwner.statusResolved
	);

	// The single full timer owner supplies both callbacks and the unfiltered running state. While the own timer
	// runs, the active team detail is still refreshed every 5 s (the team presence cadence above covers the rest).
	useTimerPolling(autoRefreshEnabled && teamReady && timerOwner.rawTimerRunning);
	// The heartbeat is what proves a TEAMS timer is still open, so it runs even with auto refresh disabled.
	useEffect(() => {
		if (!teamReady || !staleTimerChecked || !timerRunning) return;
		const interval = window.setInterval(() => timerOwner.syncTimer(), SHELL_REFRESH_INTERVAL);
		return () => window.clearInterval(interval);
	}, [staleTimerChecked, teamReady, timerRunning, timerOwner.syncTimer]);

	const activeTask = tasksOwner.activeTeamTask;
	useAutoAssignTask({ enabled: teamReady && timerOwner.statusResolved && !!activeTask });
	useTaskStatistics(0, {
		enabled: teamReady && !!activeTask,
		scope: { ...teamScope, teamId: activeTeam?.id ?? null },
		refetchInterval: autoRefreshEnabled && timerOwner.rawTimerRunning ? SHELL_REFRESH_INTERVAL : false
	});

	const credentialScope = useMemo(
		() => ({
			...teamScope,
			projectId,
			userId: user?.id ?? null,
			employeeId: user?.employee?.id ?? null,
			taskId: activeTask?.id ?? null
		}),
		[activeTask?.id, projectId, teamScope, user?.employee?.id, user?.id]
	);
	const credentialQueryKeys = useMemo(() => getShellCriticalQueryKeys(credentialScope), [credentialScope]);
	const tokenScopeFingerprint = JSON.stringify([
		credentialScope.tenantId,
		credentialScope.organizationId,
		credentialScope.teamId,
		credentialScope.projectId,
		credentialScope.userId,
		credentialScope.employeeId,
		credentialScope.taskId
	]);
	const previousTokenScopeRef = useRef({ accessToken, fingerprint: tokenScopeFingerprint });
	const currentTokenScopeRef = useRef({ accessToken, fingerprint: tokenScopeFingerprint });
	useIsomorphicLayoutEffect(() => {
		currentTokenScopeRef.current = { accessToken, fingerprint: tokenScopeFingerprint };
	}, [accessToken, tokenScopeFingerprint]);
	const mountedRef = useRef(false);
	useEffect(() => {
		mountedRef.current = true;
		return () => {
			mountedRef.current = false;
		};
	}, []);
	useEffect(() => {
		const previous = previousTokenScopeRef.current;
		previousTokenScopeRef.current = { accessToken, fingerprint: tokenScopeFingerprint };
		if (
			!accessToken ||
			!previous.accessToken ||
			previous.accessToken === accessToken ||
			previous.fingerprint !== tokenScopeFingerprint
		) {
			return;
		}

		const refreshedToken = accessToken;
		const refreshedFingerprint = tokenScopeFingerprint;
		void reownActiveQueriesAfterTokenRefresh(
			queryClient,
			workspaceReady ? credentialQueryKeys : [],
			() =>
				mountedRef.current &&
				currentTokenScopeRef.current.accessToken === refreshedToken &&
				currentTokenScopeRef.current.fingerprint === refreshedFingerprint
		);
	}, [accessToken, credentialQueryKeys, queryClient, tokenScopeFingerprint, workspaceReady]);

	useScopeTransitionGuard(
		{
			...teamScope,
			projectId,
			employeeId: user?.employee?.id ?? null,
			taskId: activeTask?.id ?? null
		},
		workspaceReady
	);

	const noTeams = teamOwner.organizationTeamsSuccess && teams.length === 0;
	const plansReady = !activeTeam?.requirePlanToTrack || timerOwner.plansResolved;
	const criticalReady =
		workspaceReady &&
		(noTeams ||
			(teamReady &&
				teamOwner.organizationTeamSuccess &&
				tasksOwner.querySuccess &&
				timerOwner.statusResolved &&
				plansReady));
	const readyScope = `${tenantId ?? ''}:${organizationId ?? ''}:${activeTeam?.id ?? 'no-team'}`;
	const markedReadyScopeRef = useRef<string | null>(null);
	const bootstrapMarkedRef = useRef(false);

	useEffect(() => {
		if (
			!bootstrapMarkedRef.current &&
			typeof performance !== 'undefined' &&
			typeof performance.mark === 'function'
		) {
			bootstrapMarkedRef.current = true;
			performance.mark('ever-teams:shell-bootstrap-start');
		}
	}, []);

	useEffect(() => {
		if (
			criticalReady &&
			markedReadyScopeRef.current !== readyScope &&
			typeof performance !== 'undefined' &&
			typeof performance.mark === 'function'
		) {
			markedReadyScopeRef.current = readyScope;
			performance.mark('ever-teams:shell-ready');
		}
	}, [criticalReady, readyScope]);

	return null;
}
