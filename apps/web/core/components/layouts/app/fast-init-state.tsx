import { useTimeLogs } from '@/core/hooks/activities/time-logs/use-time-logs';
import { useTimer } from '@/core/hooks/activities';
import { useTimerPolling } from '@/core/hooks/activities/use-timer-polling';
import { useWorkspaces } from '@/core/hooks/auth';
import { useOrganizationTeamsQuery, useTeamTasksQuery } from '@/core/hooks/organizations';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { useAutoAssignTask, useTaskStatistics } from '@/core/hooks/tasks';
import { ACCESS_TOKEN_REFRESHED_EVENT, getAccessTokenCookie } from '@/core/lib/helpers/cookies';
import { DISABLE_AUTO_REFRESH } from '@/core/constants/config/constants';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useScopeTransitionGuard } from './use-scope-transition-guard';

const SHELL_REFRESH_INTERVAL = 60_000;

export function FastInitState() {
	useTimeLogs();
	const { data: user } = useUserQuery();
	const { currentWorkspace, workspacesQuery } = useWorkspaces();
	const [accessToken, setAccessToken] = useState(() => getAccessTokenCookie());
	useEffect(() => {
		const captureRotatedToken = () => setAccessToken(getAccessTokenCookie());
		window.addEventListener(ACCESS_TOKEN_REFRESHED_EVENT, captureRotatedToken);
		return () => window.removeEventListener(ACCESS_TOKEN_REFRESHED_EVENT, captureRotatedToken);
	}, []);
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
