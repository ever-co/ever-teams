'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ConfirmDestructiveDialog } from '@/core/components/settings/kit/danger';
import { useRevokeUserApiToken } from '@/core/hooks/settings/use-user-api-tokens';
import type { TUserApiToken } from '@/core/types/schemas/user/user-api-token.schema';

type RevokeApiTokenDialogProps = {
	token: TUserApiToken | null;
	onClose: () => void;
};

/** "Revoke this token?" with the app's confirmation; a failure keeps the question open and says so. */
export function RevokeApiTokenDialog({ token, onClose }: Readonly<RevokeApiTokenDialogProps>) {
	const t = useTranslations();
	const revoke = useRevokeUserApiToken();
	const [hasFailed, setHasFailed] = useState(false);

	const close = () => {
		setHasFailed(false);
		onClose();
	};

	const confirm = () => {
		if (!token) {
			return;
		}
		setHasFailed(false);
		revoke.mutate(token.id, {
			onSuccess: close,
			onError: () => setHasFailed(true)
		});
	};

	let title = '';
	if (token) {
		title = t('settings.apiTokens.REVOKE_TITLE', { name: token.name });
	}
	let error: string | null = null;
	if (hasFailed) {
		error = t('settings.apiTokens.REVOKE_FAILED');
	}

	return (
		<ConfirmDestructiveDialog
			open={token !== null}
			onClose={close}
			title={title}
			description={t('settings.apiTokens.REVOKE_DESCRIPTION')}
			confirmLabel={t('settings.apiTokens.REVOKE_CONFIRM')}
			isPending={revoke.isPending}
			error={error}
			onConfirm={confirm}
		/>
	);
}
