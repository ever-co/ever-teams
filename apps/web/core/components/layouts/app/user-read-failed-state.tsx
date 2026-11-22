'use client';

import { useState } from 'react';
import { useTranslations, type DottedLanguageObjectStringPaths } from 'next-intl';
import { AnimatedEmptyState } from '@/core/components/common/empty-state';
import { CircleAlert } from '@/core/components/icons';
import { PageLayout } from '@/core/components/layouts/default-layout';
import { userReadFailureReasonKey } from '@/core/lib/utils/user-read-retry';

/** The last failure of a read that is being asked again: React Query clears its error while the next attempt runs. */
function useLastFailure(error: unknown): unknown {
	const [lastFailure, setLastFailure] = useState<unknown>(error);
	const isNewFailure = Boolean(error) && error !== lastFailure;
	if (isNewFailure) {
		setLastFailure(error);
	}
	if (error) {
		return error;
	}
	return lastFailure;
}

/**
 * A protected page whose signed-in user could not be read: why, in the words of the app's error feedback, and a way to
 * read it again. The session is untouched; the page loads as soon as a read answers. It stays on screen while the read
 * is asked again (`error` is then empty), so the page never flashes back to its skeleton.
 */
export function UserReadFailedState({ error, onRetry }: Readonly<{ error: unknown; onRetry: () => void }>) {
	const t = useTranslations();
	const failure = useLastFailure(error);
	const title = t('pages.error.PAGE_NOT_LOADED');
	const reasonKey = userReadFailureReasonKey(failure) as DottedLanguageObjectStringPaths;
	return (
		<PageLayout title={title}>
			<AnimatedEmptyState
				title={title}
				message={t(reasonKey)}
				icon={<CircleAlert />}
				actionLabel={t('pages.unauthorized.TRY_AGAIN')}
				actionVariant="outline"
				onAction={onRetry}
				minHeight="420px"
			/>
		</PageLayout>
	);
}
