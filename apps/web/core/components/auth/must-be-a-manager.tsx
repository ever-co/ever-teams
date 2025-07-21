'use client';
import React, { useEffect, useState } from 'react';
import { useAuthenticateUser } from '@/core/hooks';
import GlobalSkeleton from '../common/global-skeleton';
import { useRouter } from 'next/navigation';

type Props = {
	children: React.ReactNode;
	redirectTo?: string;
	useRedirect?: boolean;
};

export default function MustBeAManager({ children, redirectTo = '/', useRedirect = true }: Props) {
	const { userLoading: isLoading, isTeamManager } = useAuthenticateUser();
	const router = useRouter();
	const [checked, setChecked] = useState(false);

	useEffect(() => {
		if (!isLoading) {
			setChecked(true);
			if (!isTeamManager && redirectTo && useRedirect) {
				router.replace(redirectTo);
			}
		}
	}, [isLoading, isTeamManager, redirectTo, router]);

	if (isLoading || !checked) {
		return <GlobalSkeleton />;
	}

	if (!isTeamManager && !useRedirect) {
		return (
			<div className="p-6 mx-1 mt-10 mb-5 text-center text-red-500 bg-red-200 rounded">
				Access denied: manager rights required
			</div>
		);
	}
	if (!isTeamManager) {
		return null;
	}
	return <>{children}</>;
}
