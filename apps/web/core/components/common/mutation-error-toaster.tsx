'use client';

import { useEffect } from 'react';
import { type DottedLanguageObjectStringPaths, useTranslations } from 'next-intl';
import { useQueryClient, type Mutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { errorReasonKeyOf } from '@/core/lib/utils/error-feedback';
import { IS_DEV_MODE } from '@/core/constants/config/constants';

/** One toast for a burst of failures (a list saved row by row), replaced instead of stacked. */
const MUTATION_ERROR_TOAST_ID = 'mutation-error';

declare module '@tanstack/react-query' {
	interface Register {
		mutationMeta: {
			/** The caller shows its own message for a failure: the global fallback stays silent. */
			handlesOwnError?: boolean;
		};
	}
}

function leavesErrorToFallback(mutation: Mutation<unknown, unknown, unknown, unknown>): boolean {
	const hasOwnHandler = Boolean(mutation.options.onError);
	const callerHandlesIt = mutation.meta?.handlesOwnError === true;

	return !hasOwnHandler && !callerHandlesIt;
}

/**
 * The fallback for a mutation that failed with nobody to say so: a translated title and the reason in words,
 * never the server's text. Mutations with their own `onError`, or flagged `handlesOwnError`, are left to it.
 */
export function MutationErrorToaster() {
	const t = useTranslations();
	const queryClient = useQueryClient();

	useEffect(() => {
		return queryClient.getMutationCache().subscribe((event) => {
			const isFailure = event.type === 'updated' && event.action.type === 'error';
			if (!isFailure) {
				return;
			}
			const { mutation } = event;
			if (IS_DEV_MODE) {
				console.error('Mutation failed:', mutation.state.error);
			}
			if (!leavesErrorToFallback(mutation)) {
				return;
			}
			toast.error(t('toasts.MUTATION_FAILED'), {
				id: MUTATION_ERROR_TOAST_ID,
				description: t(errorReasonKeyOf(mutation.state.error) as DottedLanguageObjectStringPaths)
			});
		});
	}, [queryClient, t]);

	return null;
}
