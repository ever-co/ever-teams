'use client';

import React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Button, Text } from '@/core/components';
import { MainLayout } from '@/core/components/layouts/default-layout';
import { ProfileValidationResult } from '@/core/hooks/users/use-profile-validation';

interface ProfileErrorBoundaryProps {
	validation: ProfileValidationResult;
	children: React.ReactNode;
	loadTaskStatsIObserverRef?: React.RefObject<HTMLDivElement> | ((instance: Element | null) => void);
}

/**
 * Reusable error boundary for profile pages
 * Handles all error states in a consistent way
 */
export const ProfileErrorBoundary: React.FC<ProfileErrorBoundaryProps> = ({
	validation,
	children,
	loadTaskStatsIObserverRef
}) => {
	const t = useTranslations();

	// Show children if validation is successful
	if (validation.isValid) {
		return <>{children}</>;
	}

	// Don't show error for loading or unauthorized states
	if (!validation.shouldShowError) {
		return null;
	}

	return (
		<MainLayout>
			<div
				ref={loadTaskStatsIObserverRef}
				className="absolute top-[50%] left-[50%] transform -translate-x-1/2 -translate-y-1/2"
			>
				<div className="flex flex-col gap-5 justify-center items-center">
					<Text className="text-[40px] font-bold text-center text-[#282048] dark:text-light--theme">
						{validation.errorMessage || 'Error'}
					</Text>

					<Text className="max-w-md font-light text-center text-gray-400">
						{validation.errorDescription || 'Something went wrong'}
					</Text>

					<div className="flex gap-3">
						<Button className="font-normal rounded-lg" variant="outline">
							<Link href="/">{t('pages.profile.GO_TO_HOME')}</Link>
						</Button>

						{validation.state === 'timeout' && (
							<Button className="font-normal rounded-lg" onClick={() => window.location.reload()}>
								Refresh
							</Button>
						)}
					</div>

					{validation.state === 'timeout' && (
						<Text className="mt-2 text-sm text-gray-500">
							Loading took too long. Please try refreshing the page.
						</Text>
					)}
				</div>
			</div>
		</MainLayout>
	);
};
