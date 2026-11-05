'use client';

import { useTranslations } from 'next-intl';
import { PageSkeletonFrame } from '@/core/components/layouts/page-skeleton';
import { LoadingStatusLine } from '@/core/components/common/skeleton/loading-status';

/** GitHub sends the user back here after installing the app: the page only waits for the installation to be recorded. */
export function GitHubIntegrationPageSkeleton() {
	const t = useTranslations();
	return (
		<PageSkeletonFrame>
			<div className="flex min-h-[60vh] items-center justify-center">
				<LoadingStatusLine label={t('common.GITHUB_LOADING_TEXT')} />
			</div>
		</PageSkeletonFrame>
	);
}
