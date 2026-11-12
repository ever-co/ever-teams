'use client';

import { useTranslations } from 'next-intl';
import { AppDialog, AppDialogHeader, APP_DIALOG_BODY, APP_DIALOG_FOOTER } from '@/core/components/common/app-dialog';
import { Button } from '@/core/components/duplicated-components/_button';

interface DeleteViewDialogProps {
	/** The name of the view to delete; null keeps the dialog closed. */
	name: string | null;
	isBusy: boolean;
	onConfirm: () => void;
	onClose: () => void;
}

/** Asks before a saved view is deleted for everyone who sees it, in place of the browser's own confirm box. */
export function DeleteViewDialog({ name, isBusy, onConfirm, onClose }: Readonly<DeleteViewDialogProps>) {
	const t = useTranslations();
	const shownName = name ?? '';
	return (
		<AppDialog open={name !== null} onClose={onClose} width="sm" dismissible={!isBusy}>
			<AppDialogHeader title={t('taskViews.DELETE_CONFIRM_TITLE', { name: shownName })} onClose={onClose} />
			<div className={`${APP_DIALOG_BODY} pb-4`}>
				<p className="text-sm text-muted-foreground">{t('taskViews.DELETE_TEXT', { name: shownName })}</p>
			</div>
			<div className={`${APP_DIALOG_FOOTER} justify-end`}>
				<Button type="button" variant="ghost" onClick={onClose} disabled={isBusy} data-initial-focus>
					{t('taskViews.CANCEL')}
				</Button>
				<Button
					type="button"
					variant="destructive"
					onClick={onConfirm}
					disabled={isBusy}
					data-testid="delete-view-confirm"
				>
					{t('taskViews.DELETE')}
				</Button>
			</div>
		</AppDialog>
	);
}
