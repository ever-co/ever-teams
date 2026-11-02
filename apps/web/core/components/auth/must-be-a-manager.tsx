'use client';
import React, { useEffect, useState } from 'react';
import { useAuthenticateUser } from '@/core/hooks';
import { useOrganizationTeamsQuery } from '@/core/hooks/organizations';
import { useAreTeamsSettled } from '@/core/hooks/organizations/teams/use-are-teams-settled';
import GlobalSkeleton from '../common/global-skeleton';
import { useRouter } from 'next/navigation';
import { ERoleName } from '@/core/types/generics/enums/role';

type Props = {
	children: React.ReactNode;
	redirectTo?: string;
	useRedirect?: boolean;
	/** What shows while membership is checked: the guarded page's own skeleton, so the wait never changes picture. */
	fallback?: React.ReactNode;
};

const SELF_MEMBERSHIP_WAIT_MS = 8000;
const TEAMS_LIST_WAIT_MS = 30000;

function boundedWaitOf(teamsSettled: boolean) {
	if (teamsSettled) {
		return SELF_MEMBERSHIP_WAIT_MS;
	}
	return TEAMS_LIST_WAIT_MS;
}

/** Restricts report content to team managers and tenant-wide administrators. */
export default function MustBeAManager({ children, redirectTo = '/', useRedirect = true, fallback }: Props) {
	// All hooks must be called before any conditional returns
	const { user, userLoading: isUserLoading, isTeamManager } = useAuthenticateUser();
	const { getOrganizationTeamsLoading: isTeamsLoading, teams, activeTeam } = useOrganizationTeamsQuery();
	const areTeamsSettled = useAreTeamsSettled();
	const router = useRouter();
	const [checked, setChecked] = useState(false);
	const [isRedirecting, setIsRedirecting] = useState(false);
	const isGlobalAdmin =
		!!user?.role?.name && [ERoleName.ADMIN, ERoleName.SUPER_ADMIN].includes(user.role.name as ERoleName);
	const isAuthorizedManager = isTeamManager || isGlobalAdmin;

	// Determine if we're still loading critical data.
	//
	// isTeamManager is derived from activeTeam.members (a Jotai atom that an EFFECT fills after the
	// teams query resolves), so on a hard load there is a render where the query is no longer
	// "loading" but the atom is still empty → isTeamManager was momentarily false and every manager
	// got bounced from /reports/* to "/" (2026-08-17). Also: the teams query is disabled until the
	// user is known, and a disabled query reports isLoading=false. Treat all of that as "still
	// loading" until the membership data the decision depends on is really there.
	const userReady = !!user?.id && !isUserLoading;
	// The manager check compares member.employee.userId (or employeeId) with the current user, so wait
	// for the CURRENT USER'S OWN membership row to be present — "some members are loaded" was not
	// enough: on a cold first load the list can be present before the employee relation is, and
	// managers were still bounced once (verified on stage 06:30Z).
	const selfMembershipLoaded = !!activeTeam?.members?.some(
		(m) =>
			(m?.employee?.userId && m.employee.userId === user?.id) ||
			(m?.employeeId && user?.employee?.id && m.employeeId === user.employee.id)
	);
	// The `teams` atom lags the teams query by one effect, so "no teams" is only known once the shell has published
	// the list or said there is none (`useAreTeamsSettled`). The API can take several seconds to answer it: the
	// bounded wait below starts only once the teams are known, so a slow list never bounces a real manager.
	const teamsSettled = areTeamsSettled && !isTeamsLoading;
	const hasNoTeam = teamsSettled && teams.length === 0;
	const awaitsTeams = !teamsSettled;
	const awaitsSelfMembership = !hasNoTeam && !selfMembershipLoaded;
	const awaitsMembership = awaitsTeams || awaitsSelfMembership;
	const membershipPending = !userReady || (!isGlobalAdmin && awaitsMembership);
	// Safety valve: the user's own membership row may never appear (the active-team cookie points at a team the user
	// left), or the teams may never come (a failed request); decide after a bounded wait instead of showing the
	// skeleton forever. The wait for the teams themselves is long because the API can be slow to list them.
	const [waitedTooLong, setWaitedTooLong] = useState(false);
	useEffect(() => {
		if (!membershipPending) return;
		const timer = setTimeout(() => setWaitedTooLong(true), boundedWaitOf(teamsSettled));
		return () => clearTimeout(timer);
	}, [membershipPending, teamsSettled]);
	const isLoading = membershipPending && !waitedTooLong;

	useEffect(() => {
		// Only proceed with authorization check when both user and teams data are loaded
		if (!isLoading) {
			setChecked(true);
			if (!isAuthorizedManager && redirectTo && useRedirect) {
				setIsRedirecting(true);
				router.replace(redirectTo);
			}
		}
	}, [isLoading, isAuthorizedManager, redirectTo, router, useRedirect]);

	// Compute all conditions after all hooks are called
	const shouldShowLoading = isLoading || !checked || isRedirecting;
	const shouldShowAccessDenied = !isAuthorizedManager && !useRedirect;
	const shouldShowLoadingForRedirect = !isAuthorizedManager && useRedirect;
	const shouldShowChildren = isAuthorizedManager;

	const pending = fallback ?? <GlobalSkeleton />;

	// Conditional rendering after all hooks
	if (shouldShowLoading) {
		return pending;
	}

	if (shouldShowAccessDenied) {
		return (
			<div className="p-6 mx-1 mt-10 mb-5 text-sm text-center rounded-xl bg-destructive/10 text-destructive-ink">
				Access denied: manager rights required
			</div>
		);
	}

	if (shouldShowLoadingForRedirect) {
		return pending;
	}

	if (shouldShowChildren) {
		return <>{children}</>;
	}

	// Fallback (should not reach here)
	return pending;
}
