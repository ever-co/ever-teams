'use client';
import React, { useEffect, useState } from 'react';
import { useAuthenticateUser } from '@/core/hooks';
import { useOrganizationTeamsQuery } from '@/core/hooks/organizations';
import GlobalSkeleton from '../common/global-skeleton';
import { useRouter } from 'next/navigation';
import { ERoleName } from '@/core/types/generics/enums/role';

type Props = {
	children: React.ReactNode;
	redirectTo?: string;
	useRedirect?: boolean;
};

/** Restricts report content to team managers and tenant-wide administrators. */
export default function MustBeAManager({ children, redirectTo = '/', useRedirect = true }: Props) {
	// All hooks must be called before any conditional returns
	const { user, userLoading: isUserLoading, isTeamManager } = useAuthenticateUser();
	const { getOrganizationTeamsLoading: isTeamsLoading, teams, activeTeam } = useOrganizationTeamsQuery();
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
	// NOTE: the `teams` atom lags the teams query by one effect too — right after the query resolves the
	// atom is still [] for a render (a full page load of any /reports URL is a cold load). "No teams"
	// therefore keeps waiting as well; a user with genuinely zero teams is decided by the bounded wait.
	const membershipPending =
		!userReady || (!isGlobalAdmin && (isTeamsLoading || teams.length === 0 || !selfMembershipLoaded));
	// Safety valve: if membership never resolves (e.g. the active-team cookie points at a team the user
	// is no longer in), decide after a bounded wait instead of showing the skeleton forever.
	const [waitedTooLong, setWaitedTooLong] = useState(false);
	useEffect(() => {
		if (!membershipPending) return;
		const timer = setTimeout(() => setWaitedTooLong(true), 8000);
		return () => clearTimeout(timer);
	}, [membershipPending]);
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

	// Conditional rendering after all hooks
	if (shouldShowLoading) {
		return <GlobalSkeleton />;
	}

	if (shouldShowAccessDenied) {
		return (
			<div className="p-6 mx-1 mt-10 mb-5 text-center text-red-500 bg-red-200 rounded">
				Access denied: manager rights required
			</div>
		);
	}

	if (shouldShowLoadingForRedirect) {
		return <GlobalSkeleton />;
	}

	if (shouldShowChildren) {
		return <>{children}</>;
	}

	// Fallback (should not reach here)
	return <GlobalSkeleton />;
}
