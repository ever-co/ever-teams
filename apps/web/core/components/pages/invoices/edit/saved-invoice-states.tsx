'use client';

import { useTranslations } from 'next-intl';
import { DashboardErrorNotice } from '@/core/components/dashboards/kit/dashboard-states';
import type { SavedInvoice, SavedInvoiceStatus } from '@/core/lib/utils/invoice-edit';
import { INVOICES_PATH } from '../invoice-access-guard';
import { MessageLink, NewInvoiceMessage } from '../new/new-invoice-states';

function BackToInvoices() {
	const t = useTranslations();
	return <MessageLink href={INVOICES_PATH}>{t('invoices.edit.BACK_TO_LIST')}</MessageLink>;
}

interface SavedInvoiceMessageProps {
	status: Exclude<SavedInvoiceStatus, 'loading' | 'ready'>;
	number: number | null;
	onRetry: () => void;
}

/** Why a saved invoice is not on the screen: a read that failed, an invoice gone, or one this screen did not make. */
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
	return (
		<NewInvoiceMessage
			title={t('invoices.edit.NOT_FROM_TIME_TITLE', { number: String(number ?? '') })}
			message={t('invoices.edit.NOT_FROM_TIME_MESSAGE')}
			action={<BackToInvoices />}
		/>
	);
}

/** Something was paid on it, or it is void: it is replaced, never changed. */
export function LockedInvoiceMessage({ saved }: Readonly<{ saved: SavedInvoice }>) {
	const t = useTranslations();
	let message = t('invoices.edit.LOCKED_PAID');
	if (saved.status === 'VOID') {
		message = t('invoices.edit.LOCKED_VOID');
	}
	return (
		<NewInvoiceMessage
			title={t('invoices.edit.LOCKED_TITLE', { number: String(saved.number) })}
			message={message}
			action={<BackToInvoices />}
		/>
	);
}
