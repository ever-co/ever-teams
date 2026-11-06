'use client';

import React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Button } from '@/core/components';
import { PageLayout } from '@/core/components/layouts/default-layout';
import { ProfileValidationResult } from '@/core/hooks/users/use-profile-validation';
import { ArrowLeft, UserCircle } from '@/core/components/icons';

interface ProfileErrorBoundaryProps {
	validation: ProfileValidationResult;
	children: React.ReactNode;
	loadTaskStatsIObserverRef?: React.RefObject<HTMLDivElement> | ((instance: Element | null) => void);
}

const BACK_LINK_CLASS_NAME =
	'flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/25';

/**
 * A profile that cannot be shown: a member who is not in this team, a missing member id, a team that took too long
 * to arrive. One card where the page would be, with the way back and, for a timeout, a way to try again.
 */
export const ProfileErrorBoundary: React.FC<ProfileErrorBoundaryProps> = ({
	validation,
	children,
	loadTaskStatsIObserverRef
}) => {
	const t = useTranslations();
	const router = useRouter();

	if (validation.isValid) {
		return <>{children}</>;
	}

	if (!validation.shouldShowError) {
		return null;
	}

	const isTimeout = validation.state === 'timeout';
	const title = validation.errorMessage || t('profile.page.ERROR_TITLE');
	const description = validation.errorDescription || t('profile.page.ERROR_DESCRIPTION');

	return (
		<PageLayout
			breadcrumb={
				<Link href="/" aria-label={t('profile.page.BACK_TO_TEAM')} className={BACK_LINK_CLASS_NAME}>
					<ArrowLeft className="size-4" />
				</Link>
			}
		>
			<div ref={loadTaskStatsIObserverRef} className="flex min-h-[60vh] items-center justify-center px-4 py-10">
				<div className="flex w-full max-w-sm flex-col items-center gap-4 text-center">
					<span className="flex size-10 items-center justify-center rounded-xl keycap-3d text-foreground/70 [&_svg]:size-5">
						<UserCircle aria-hidden="true" />
					</span>
					<div className="flex flex-col gap-1.5">
						<h1 className="text-lg font-semibold text-balance text-foreground">{title}</h1>
						<p className="text-sm text-balance text-muted-foreground">{description}</p>
						{isTimeout && (
							<p className="text-sm text-balance text-muted-foreground">
								{t('profile.page.LOADING_TOO_LONG')}
							</p>
						)}
					</div>
					<div className="flex flex-wrap items-center justify-center gap-2">
						<Button variant="outline" asChild>
							<Link href="/">{t('pages.profile.GO_TO_HOME')}</Link>
						</Button>
						{isTimeout && <Button onClick={() => router.refresh()}>{t('profile.page.TRY_AGAIN')}</Button>}
					</div>
				</div>
			</div>
		</PageLayout>
	);
};
