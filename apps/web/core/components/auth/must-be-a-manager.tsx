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

	// Show loading while waiting for user or team data, or during redirection
	if (isLoading || !checked || isRedirecting) {
		return <GlobalSkeleton />;
	}

	// Show access denied message if not using redirect
	if (!isTeamManager && !useRedirect) {
		return (
			<div className="p-6 mx-1 mt-10 mb-5 text-center text-red-500 bg-red-200 rounded">
				Access denied: manager rights required
			</div>
		);
	}

	// If not a manager and redirect is enabled, show loading (redirection should be in progress)
	if (!isTeamManager) {
		return <GlobalSkeleton />;
	}

	// Render children if user is a manager
	return <>{children}</>;
}
