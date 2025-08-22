'use client';
import React, { useEffect, useState } from 'react';
import { useAuthenticateUser } from '@/core/hooks';
import { useOrganizationTeams } from '@/core/hooks/organizations';
import GlobalSkeleton from '../common/global-skeleton';
import { useRouter } from 'next/navigation';

type Props = {
	children: React.ReactNode;
	redirectTo?: string;
	useRedirect?: boolean;
};

export default function MustBeAManager({ children, redirectTo = '/', useRedirect = true }: Props) {
	// All hooks must be called before any conditional returns
	const { userLoading: isUserLoading, isTeamManager } = useAuthenticateUser();
	const { getOrganizationTeamsLoading: isTeamsLoading } = useOrganizationTeams();
	const router = useRouter();
	const [checked, setChecked] = useState(false);
	const [isRedirecting, setIsRedirecting] = useState(false);

	// Determine if we're still loading critical data
	const isLoading = isUserLoading || isTeamsLoading;

	useEffect(() => {
		// Only proceed with authorization check when both user and teams data are loaded
		if (!isLoading) {
			setChecked(true);
			if (!isTeamManager && redirectTo && useRedirect) {
				setIsRedirecting(true);
				router.replace(redirectTo);
			}
		}
	}, [isLoading, isTeamManager, redirectTo, router, useRedirect]);

	// Compute all conditions after all hooks are called
	const shouldShowLoading = isLoading || !checked || isRedirecting;
	const shouldShowAccessDenied = !isTeamManager && !useRedirect;
	const shouldShowLoadingForRedirect = !isTeamManager && useRedirect;
	const shouldShowChildren = isTeamManager;

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
