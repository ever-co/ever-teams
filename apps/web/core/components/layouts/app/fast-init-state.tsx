import { useTimeLogs } from '@/core/hooks/activities/time-logs/use-time-logs';
import { useTimer } from '@/core/hooks/activities';
import { useTimerPolling } from '@/core/hooks/activities/use-timer-polling';
import { useWorkspaces } from '@/core/hooks/auth';
import { useReactiveAccessTokenCookie } from '@/core/hooks/auth/use-reactive-access-token-cookie';
import { useIsomorphicLayoutEffect } from '@/core/hooks/common/use-isomorphic-layout-effect';
import { useOrganizationTeamsQuery, useTeamTasksQuery } from '@/core/hooks/organizations';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { useAutoAssignTask, useTaskStatistics } from '@/core/hooks/tasks';
import { DISABLE_AUTO_REFRESH } from '@/core/constants/config/constants';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef } from 'react';
import { reownActiveQueriesAfterTokenRefresh } from './token-refresh-query-ownership';
import { getFastShellCriticalQueryKeys, useScopeTransitionGuard } from './use-scope-transition-guard';

const SHELL_REFRESH_INTERVAL = 60_000;

export function FastInitState() {
	useTimeLogs();
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
	const autoRefreshEnabled = !DISABLE_AUTO_REFRESH.value;
	const baseScope = useMemo(
		() => ({
			tenantId,
			organizationId,
			userId: user?.id ?? null,
			accessToken
		}),
		[accessToken, organizationId, tenantId, user?.id]
	);
	const teamOwner = useOrganizationTeamsQuery({
		enabled: workspaceReady,
		scope: baseScope,
		refetchInterval: autoRefreshEnabled ? SHELL_REFRESH_INTERVAL : false,
		detailRefetchInterval: autoRefreshEnabled ? SHELL_REFRESH_INTERVAL : false
	});
	const { activeTeam, teams } = teamOwner;
	const teamReady = !!(
		workspaceReady &&
		teamOwner.organizationTeamsSuccess &&
		teamOwner.organizationTeamSuccess &&
		activeTeam?.id
	);
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
		refetchInterval: autoRefreshEnabled ? SHELL_REFRESH_INTERVAL : false
	});
	const timerOwner = useTimer({
		enabled: teamReady,
		scope: teamScope,
		statusEnabled: teamReady,
		statusRefetchInterval: autoRefreshEnabled ? SHELL_REFRESH_INTERVAL : false,
		plansEnabled: true,
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

	// The single full timer owner supplies both callbacks and the unfiltered running state.
	useTimerPolling(autoRefreshEnabled && teamReady && timerOwner.rawTimerRunning);
	useEffect(() => {
		if (!autoRefreshEnabled || !teamReady || !timerOwner.rawTimerRunning) return;
		const interval = window.setInterval(() => timerOwner.syncTimer(), SHELL_REFRESH_INTERVAL);
		return () => window.clearInterval(interval);
	}, [autoRefreshEnabled, teamReady, timerOwner.rawTimerRunning, timerOwner.syncTimer]);

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
	const credentialQueryKeys = useMemo(() => getFastShellCriticalQueryKeys(credentialScope), [credentialScope]);
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
			!workspaceReady ||
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
			credentialQueryKeys,
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
		(noTeams || (teamReady && tasksOwner.querySuccess && timerOwner.statusResolved && plansReady));
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
