'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/core/components/common/button';
import { SpinnerLoader } from '@/core/components/common/loader';
import { Text } from '@/core/components/common/typography';
import { AccountDeletionRow } from '@/core/components/pages/auth/delete-account/account-deletion-row';
import type { IAccountDeletionVerifyResponse } from '@/core/lib/auth/account-deletion';

/**
 * The body of the Danger Zone's "Delete all data" modal: what deleting the signed-in account will do in its current
 * workspace (Gauzy `GET /account-deletion/me`), and what is kept.
 */
export function DeleteMyAccountPreview({
	preview,
	loading,
	error,
	onRetry
}: Readonly<{
	preview?: IAccountDeletionVerifyResponse;
	loading: boolean;
	error: unknown;
	/** Reads the preview again after a failure. */
	onRetry: () => void;
}>) {
	const t = useTranslations();

	if (loading) {
		return (
			<div className="flex gap-2 justify-center items-center py-3 text-sm text-muted-foreground">
				<SpinnerLoader size={18} />
				<span>{t('pages.accountDeletion.CHECKING_ACCOUNT')}</span>
			</div>
		);
	}

	// A failed read hides any preview cached from before: the modal's Confirm stays disabled until a read succeeds.
	if (error || !preview?.accounts?.length) {
		const reason = error instanceof Error && error.message ? ` ${error.message}` : '';
		return (
			<div className="flex flex-wrap gap-2 justify-between items-center" data-testid="delete-my-account-preview-error">
				<Text.Error className="text-xs" role="alert">
					{`${t('pages.accountDeletion.PREVIEW_ERROR')}${reason}`}
				</Text.Error>
				<Button type="button" variant="outline" className="px-3 py-1 h-8 text-xs" onClick={onRetry}>
					{t('pages.accountDeletion.TRY_AGAIN')}
				</Button>
			</div>
		);
	}

	return (
		<div className="space-y-3 text-left" data-testid="delete-my-account-preview">
			<ul className="space-y-2">
				{preview.accounts.map((account, index) => (
					<AccountDeletionRow key={`${account.workspace}-${index}`} account={account} />
				))}
			</ul>
			<p className="text-xs text-muted-foreground">{t('pages.accountDeletion.WHAT_IS_KEPT')}</p>
			<p className="text-xs text-muted-foreground">{t('pages.accountDeletion.SIGN_OUT_AFTER')}</p>
		</div>
	);
}
