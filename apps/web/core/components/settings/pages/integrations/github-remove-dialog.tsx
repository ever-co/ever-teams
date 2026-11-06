'use client';

import { useState } from 'react';
import { type DottedLanguageObjectStringPaths, useTranslations } from 'next-intl';
import { Integration, StopCircle, Task } from '@/core/components/icons';
import { ConfirmDestructiveDialog, type DangerConsequence } from '@/core/components/settings/kit/danger';
import { SETTINGS_ROW_DESCRIPTION, SETTINGS_ROW_LABEL } from '@/core/components/settings/kit/settings-page';
import { errorReasonKeyOf } from '@/core/lib/utils/error-feedback';
import { GithubTile } from './integrations-settings-skeleton';

type GithubRemoveDialogProps = {
	open: boolean;
	account: string | null;
	onClose: () => void;
	onConfirm: () => Promise<void>;
};

/**
 * Gauzy uninstalls the App on GitHub when the organization's integration tenant is deleted, so every team of the
 * organization loses it.
 */
export function GithubRemoveDialog({ open, account, onClose, onConfirm }: Readonly<GithubRemoveDialogProps>) {
	const t = useTranslations();
	const [isPending, setIsPending] = useState(false);
	const [error, setError] = useState<string | null>(null);

	let uninstallText = t('settings.integrations.github.REMOVE_UNINSTALLS_NO_ACCOUNT');
	if (account) {
		uninstallText = t('settings.integrations.github.REMOVE_UNINSTALLS', { account });
	}
	const consequences: DangerConsequence[] = [
		{ key: 'uninstall', icon: <Integration />, text: uninstallText },
		{ key: 'sync', icon: <StopCircle />, text: t('settings.integrations.github.REMOVE_STOPS_SYNC') },
		{ key: 'tasks', icon: <Task />, text: t('settings.integrations.github.REMOVE_KEEPS_TASKS') }
	];

	const close = () => {
		setError(null);
		onClose();
	};

	const confirm = async () => {
		setIsPending(true);
		setError(null);
		try {
			await onConfirm();
			onClose();
		} catch (failure) {
			const reasonKey = errorReasonKeyOf(failure) as DottedLanguageObjectStringPaths;
			setError(t(reasonKey));
		} finally {
			setIsPending(false);
		}
	};

	const subject = (
		<div className="flex items-center gap-3 rounded-xl px-3 py-2.5 hairline-ring ring-border">
			<GithubTile />
			<div className="flex min-w-0 flex-col gap-0.5">
				<span className={SETTINGS_ROW_LABEL}>{t('pages.settingsTeam.GITHUB')}</span>
				{account && <span className={SETTINGS_ROW_DESCRIPTION}>{account}</span>}
			</div>
		</div>
	);

	return (
		<ConfirmDestructiveDialog
			open={open}
			onClose={close}
			title={t('settings.integrations.github.REMOVE_TITLE')}
			description={t('settings.integrations.github.REMOVE_DESCRIPTION')}
			subject={subject}
			consequences={consequences}
			confirmLabel={t('settings.integrations.github.REMOVE_CONFIRM')}
			isPending={isPending}
			error={error}
			onConfirm={() => void confirm()}
		/>
	);
}
