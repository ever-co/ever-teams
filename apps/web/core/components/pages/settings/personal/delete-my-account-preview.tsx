'use client';

import { useTranslations } from 'next-intl';
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
	error
}: {
	preview?: IAccountDeletionVerifyResponse;
	loading: boolean;
	error: unknown;
}) {
	const t = useTranslations();

	if (loading) {
		return (
			<div className="flex gap-2 justify-center items-center py-3 text-sm text-muted-foreground">
				<SpinnerLoader size={18} />
				<span>{t('pages.accountDeletion.CHECKING_ACCOUNT')}</span>
			</div>
		);
	}

	if (error || !preview?.accounts?.length) {
		const reason = error instanceof Error && error.message ? ` ${error.message}` : '';
		return (
			<Text.Error className="block text-xs" role="alert" data-testid="delete-my-account-preview-error">
				{`${t('pages.accountDeletion.PREVIEW_ERROR')}${reason}`}
			</Text.Error>
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
