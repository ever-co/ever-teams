'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { Notice } from '@/core/components/common/notice';
import { Button } from '@/core/components/duplicated-components/_button';
import { BlockEmptyMessage } from '@/core/components/dashboards/kit/dashboard-states';
import { InvoiceStandingLabel } from '@/core/components/invoices/invoice-standing';
import { InvoiceDetailPaper } from '@/core/components/pages/invoices/detail/invoice-detail-paper';
import {
	InvoiceDetailBodySkeleton,
	InvoiceDetailHeaderSkeleton
} from '@/core/components/pages/invoices/detail/invoice-detail-skeleton';
import { APP_NAME } from '@/core/constants/config/constants';
import { formatOwed } from '@/core/lib/utils/dashboards/payments-due';
import { downloadBlob } from '@/core/lib/utils/dashboard-export';
import { errorStatusOf } from '@/core/lib/utils/error-feedback';
import { invoiceNumberTextOf, invoicePdfFileNameOf } from '@/core/lib/utils/invoice-labels';
import { todayDayKey } from '@/core/lib/utils/invoices';
import { PAID_RETURN_QUERY, paymentReturnUrlOf } from '@/core/lib/utils/shared-invoice';
import { sharedInvoiceService } from '@/core/services/client/api/public/shared-invoice.service';
import type { TSharedInvoice } from '@/core/types/schemas/organization/shared-invoice.schema';

/** How often the page reads the invoice again after the client came back from paying, until it shows paid. */
const CONFIRMATION_POLL_MS = 5_000;
/** How long it keeps reading: the provider's confirmation usually lands within seconds. */
const CONFIRMATION_POLL_LIMIT_MS = 2 * 60_000;

const PAID_STATUSES = new Set(['FULLY_PAID', 'OVERPAID']);

function senderNameOf(invoice: TSharedInvoice): string | null {
	const sender = invoice.fromOrganization ?? invoice.organization;
	return sender?.officialName?.trim() || sender?.name?.trim() || null;
}

function useSharedInvoice(id: string, token: string, isReturn: boolean) {
	const [returnedAt] = useState(() => Date.now());
	const invoice = useQuery({
		queryKey: ['shared-invoice', id, token],
		queryFn: () => sharedInvoiceService.getSharedInvoice(id, token),
		retry: (count, error) => errorStatusOf(error) !== 403 && count < 2,
		refetchInterval: (query) => {
			const status = query.state.data?.status ?? '';
			const isWaiting =
				isReturn && !PAID_STATUSES.has(status) && Date.now() - returnedAt < CONFIRMATION_POLL_LIMIT_MS;
			return isWaiting ? CONFIRMATION_POLL_MS : false;
		}
	});
	const payOption = useQuery({
		queryKey: ['shared-invoice-pay-option', id, token, invoice.data?.status, invoice.data?.alreadyPaid],
		queryFn: () => sharedInvoiceService.getPayOption(id, token),
		enabled: invoice.isSuccess,
		retry: false
	});
	return { invoice, payOption };
}

function PayButton({ id, token, label }: Readonly<{ id: string; token: string; label: string }>) {
	const t = useTranslations();
	const [isOpening, setIsOpening] = useState(false);
	const [hasFailed, setHasFailed] = useState(false);

	const pay = async () => {
		setIsOpening(true);
		setHasFailed(false);
		try {
			const url = await sharedInvoiceService.startCheckout(id, token, paymentReturnUrlOf(window.location.href));
			window.location.assign(url);
		} catch {
			setHasFailed(true);
			setIsOpening(false);
		}
	};

	return (
		<div className="flex flex-col items-stretch gap-2 sm:items-end">
			<Button type="button" onClick={() => void pay()} disabled={isOpening} className="min-w-40">
				{isOpening ? t('invoices.shared.PAYING') : label}
			</Button>
			{hasFailed && (
				<p role="alert" className="text-xs text-destructive">
					{t('invoices.shared.PAY_FAILED')}
				</p>
			)}
		</div>
	);
}

function DownloadButton({ id, token, numberText }: Readonly<{ id: string; token: string; numberText: string | null }>) {
	const t = useTranslations();
	const [isDownloading, setIsDownloading] = useState(false);
	const [hasFailed, setHasFailed] = useState(false);

	const download = async () => {
		setIsDownloading(true);
		setHasFailed(false);
		try {
			const pdf = await sharedInvoiceService.downloadSharedInvoicePdf(id, token);
			downloadBlob(pdf, invoicePdfFileNameOf(numberText));
		} catch {
			setHasFailed(true);
		} finally {
			setIsDownloading(false);
		}
	};

	return (
		<div className="flex flex-col items-stretch gap-2 sm:items-end">
			<Button type="button" variant="outline" onClick={() => void download()} disabled={isDownloading}>
				{t('invoices.actions.DOWNLOAD')}
			</Button>
			{hasFailed && (
				<p role="alert" className="text-xs text-destructive">
					{t('invoices.shared.DOWNLOAD_FAILED')}
				</p>
			)}
		</div>
	);
}

/**
 * The public page of an invoice (ever-co/ever-gauzy#11856), opened from the link in the invoice's email without an
 * account: the invoice as a document, where it stands, its PDF, and Pay when the workspace connected a payment provider
 * and something is left to pay. Back from the provider, the page says the payment is being confirmed and shows it
 * paid once the provider's confirmation reached the API.
 */
export function SharedInvoicePage({ id, token }: Readonly<{ id: string; token: string }>) {
	const t = useTranslations();
	const locale = useLocale();
	const isReturn = useSearchParams()?.get(PAID_RETURN_QUERY) === '1';
	const { invoice, payOption } = useSharedInvoice(id, token, isReturn);
	const timeZone = null;
	const todayKey = todayDayKey(timeZone);

	if (invoice.isPending) {
		return (
			<SharedInvoiceFrame>
				<output aria-label={t('common.LOADING')} className="flex flex-col gap-6">
					<InvoiceDetailHeaderSkeleton />
					<InvoiceDetailBodySkeleton />
				</output>
			</SharedInvoiceFrame>
		);
	}

	if (invoice.isError) {
		const isClosed = errorStatusOf(invoice.error) === 403;
		return (
			<SharedInvoiceFrame>
				<BlockEmptyMessage
					className="rounded-xl bg-card hairline-ring ring-border"
					title={isClosed ? t('invoices.shared.CLOSED_TITLE') : t('invoices.edit.LOAD_ERROR_TITLE')}
					message={isClosed ? t('invoices.shared.CLOSED_MESSAGE') : undefined}
					action={
						isClosed ? undefined : (
							<Button type="button" variant="outline" onClick={() => void invoice.refetch()}>
								{t('pages.unauthorized.TRY_AGAIN')}
							</Button>
						)
					}
				/>
			</SharedInvoiceFrame>
		);
	}

	const shown = invoice.data;
	const numberText = invoiceNumberTextOf(shown);
	const senderName = senderNameOf(shown);
	const isPaid = PAID_STATUSES.has(shown.status ?? '');
	const option = payOption.data;
	const canPay = Boolean(option?.payable) && typeof option?.amountDue === 'number' && !isPaid;
	const payLabel = canPay
		? t('invoices.shared.PAY', {
				amount: formatOwed(option.amountDue as number, option.currency ?? shown.currency ?? null, locale)
			})
		: '';

	return (
		<SharedInvoiceFrame>
			<header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
				<div className="flex min-w-0 flex-col gap-1">
					<div className="flex min-w-0 flex-wrap items-center gap-2.5">
						<h1 className="text-xl font-semibold text-foreground tabular-nums">
							{numberText
								? t('invoices.detail.HEADING', { number: numberText })
								: t('invoices.detail.PAPER_TITLE')}
						</h1>
						<InvoiceStandingLabel invoice={shown} todayKey={todayKey} timeZone={timeZone} variant="badge" />
					</div>
					{senderName && (
						<p className="text-[13px] text-muted-foreground">
							{t('invoices.shared.FROM_SENDER', { name: senderName })}
						</p>
					)}
				</div>
				<div className="flex flex-col gap-2 sm:flex-row sm:items-start">
					<DownloadButton id={id} token={token} numberText={numberText} />
					{canPay && <PayButton id={id} token={token} label={payLabel} />}
				</div>
			</header>
			{isReturn && !isPaid && (
				<Notice
					tone="info"
					title={t('invoices.shared.RETURNED_TITLE')}
					description={t('invoices.shared.RETURNED_MESSAGE')}
				/>
			)}
			{isPaid && (
				<Notice
					tone="success"
					title={t('invoices.shared.PAID_TITLE')}
					description={t('invoices.shared.PAID_MESSAGE')}
				/>
			)}
			<InvoiceDetailPaper
				invoice={shown}
				senderName={senderName}
				clientName={shown.toContact?.name?.trim() || ''}
				numberText={numberText}
				timeZone={timeZone}
			/>
		</SharedInvoiceFrame>
	);
}

/** The page's frame: one column on a quiet background, with the app's name at the foot. */
function SharedInvoiceFrame({ children }: Readonly<{ children: React.ReactNode }>) {
	const t = useTranslations();
	return (
		<main className="min-h-dvh bg-background px-4 py-8 sm:px-6 sm:py-12">
			<div className="mx-auto flex w-full max-w-3xl flex-col gap-6">{children}</div>
			<p className="mx-auto mt-10 max-w-3xl text-center text-xs text-muted-foreground">
				{t('invoices.shared.FOOTER', { app: APP_NAME })}
			</p>
		</main>
	);
}
