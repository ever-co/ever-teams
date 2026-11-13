'use client';

import { useTranslations } from 'next-intl';
import { DashboardErrorNotice } from '@/core/components/dashboards/kit/dashboard-states';
import type { SavedInvoice, SavedInvoiceStatus } from '@/core/lib/utils/invoice-edit';
import { INVOICES_PATH } from '../invoice-access-guard';
import { MessageLink, NewInvoiceMessage, NewInvoicePageSkeleton } from '../new/new-invoice-states';

/** The invoice screen while an invoice is read to be edited. */
export function EditInvoicePageSkeleton() {
	const t = useTranslations();
	return <NewInvoicePageSkeleton title={t('invoices.edit.LOADING_TITLE')} />;
}

function BackToInvoices() {
	const t = useTranslations();
	return <MessageLink href={INVOICES_PATH}>{t('invoices.edit.BACK_TO_LIST')}</MessageLink>;
}

interface SavedInvoiceMessageProps {
	status: Exclude<SavedInvoiceStatus, 'loading' | 'ready'>;
	number: number | null;
	onRetry: () => void;
}

/**
 * Why a saved invoice is not on the screen: a read that failed, an invoice gone or of another workspace, or one this
 * screen did not make.
 */
export function SavedInvoiceMessage({ status, number, onRetry }: Readonly<SavedInvoiceMessageProps>) {
	const t = useTranslations();
	if (status === 'workspaceError') {
		return <DashboardErrorNotice title={t('invoices.new.ORGANIZATION_ERROR_TITLE')} onRetry={onRetry} />;
	}
	if (status === 'error') {
		return <DashboardErrorNotice title={t('invoices.edit.LOAD_ERROR_TITLE')} onRetry={onRetry} />;
	}
	if (status === 'missing') {
		return (
			<NewInvoiceMessage
				title={t('invoices.edit.NOT_FOUND_TITLE')}
				message={t('invoices.edit.NOT_FOUND_MESSAGE')}
				action={<BackToInvoices />}
			/>
		);
	}
	if (status === 'otherWorkspace') {
		return (
			<NewInvoiceMessage
				title={t('invoices.edit.OTHER_WORKSPACE_TITLE', { number: String(number ?? '') })}
				message={t('invoices.edit.OTHER_WORKSPACE_MESSAGE')}
				action={<BackToInvoices />}
			/>
		);
	}
	return (
		<NewInvoiceMessage
			title={t('invoices.edit.NOT_FROM_TIME_TITLE', { number: String(number ?? '') })}
			message={t('invoices.edit.NOT_FROM_TIME_MESSAGE')}
			action={<BackToInvoices />}
		/>
	);
}

/** Only a void invoice is replaced: one still live is edited, or voided and replaced, from its menu in the list. */
export function NotVoidInvoiceMessage({ number }: Readonly<{ number: number }>) {
	const t = useTranslations();
	return (
		<NewInvoiceMessage
			title={t('invoices.replace.NOT_VOID_TITLE', { number: String(number) })}
			message={t('invoices.replace.NOT_VOID_MESSAGE')}
			action={<BackToInvoices />}
		/>
	);
}

/**
 * Something was paid on it, or it is void: it is replaced, never changed. Reached after a save refused for that
 * reason, it says the changes were not saved.
 */
export function LockedInvoiceMessage({
	saved,
	wasSaveRefused = false
}: Readonly<{ saved: SavedInvoice; wasSaveRefused?: boolean }>) {
	const t = useTranslations();
	const number = String(saved.number);
	let message = t('invoices.edit.LOCKED_PAID');
	if (saved.status === 'VOID') {
		message = t('invoices.edit.LOCKED_VOID');
	}
	if (wasSaveRefused) {
		message = t('invoices.edit.confirm.LOCKED_NOW', { number });
	}
	return (
		<NewInvoiceMessage
			title={t('invoices.edit.LOCKED_TITLE', { number })}
			message={message}
			action={<BackToInvoices />}
		/>
	);
}
