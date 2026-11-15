'use client';

import { useEffect, useState } from 'react';
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
import { keepLinkWhilePaying, useSharedInvoiceLink } from '@/core/hooks/invoices/use-shared-invoice-link';
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
/** How long it reads that often: the provider's confirmation usually lands within seconds. */
const CONFIRMATION_POLL_LIMIT_MS = 2 * 60_000;
/**
 * How often it reads it afterwards, while the page is shown, so it still shows paid a confirmation that comes late, as
 * the notice says it will.
 */
const LATE_CONFIRMATION_POLL_MS = 30_000;

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
			// A link the API no longer honours is not read again: the page says so, with nothing to wait for
			if (errorStatusOf(query.state.error) === 403) {
				return false;
			}
			const status = query.state.data?.status ?? '';
			if (!isReturn || PAID_STATUSES.has(status)) {
				return false;
			}
			return Date.now() - returnedAt < CONFIRMATION_POLL_LIMIT_MS
				? CONFIRMATION_POLL_MS
				: LATE_CONFIRMATION_POLL_MS;
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
			keepLinkWhilePaying(id, token);
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

/** The page's skeleton, while the invoice or the link that names it is read. */
function SharedInvoiceLoading() {
	const t = useTranslations();
	return (
		<SharedInvoiceFrame>
			<output aria-label={t('common.LOADING')} className="flex flex-col gap-6">
				<InvoiceDetailHeaderSkeleton />
				<InvoiceDetailBodySkeleton />
			</output>
		</SharedInvoiceFrame>
	);
}

/**
 * The public page of an invoice (ever-co/ever-gauzy#11856), opened from the link in the invoice's email without an
 * account: the invoice as a document, where it stands, its PDF, and Pay when the workspace connected a payment provider
 * and something is left to pay. Back from the provider, the page says the payment is being confirmed and shows it
 * paid once the provider's confirmation reached the API. The link is read from the fragment of the page's address,
 * which no server receives (use-shared-invoice-link.ts).
 */
export function SharedInvoicePage() {
	const t = useTranslations();
	const link = useSharedInvoiceLink();
	const isReturn = useSearchParams()?.get(PAID_RETURN_QUERY) === '1';

	if (link === undefined) {
		return <SharedInvoiceLoading />;
	}
	if (link === null) {
		return (
			<SharedInvoiceFrame>
				{isReturn ? (
					<Notice
						tone="info"
						title={t('invoices.shared.RETURNED_TITLE')}
						description={t('invoices.shared.RETURNED_MESSAGE')}
					/>
				) : (
					<BlockEmptyMessage
						className="rounded-xl bg-card hairline-ring ring-border"
						title={t('invoices.shared.CLOSED_TITLE')}
						message={t('invoices.shared.CLOSED_MESSAGE')}
					/>
				)}
			</SharedInvoiceFrame>
		);
	}
	return <SharedInvoiceView id={link.id} token={link.token} isReturn={isReturn} />;
}

/**
 * Whether the page, back from the payment provider, is in the first two minutes of waiting for the provider's
 * confirmation, when the payment just made is the one on its way. Past them Pay is offered again, for a payment the
 * client cancelled at the provider (which returns to the same address).
 */
function useIsConfirmingPayment(isReturn: boolean) {
	const [isWindowOver, setIsWindowOver] = useState(false);
	useEffect(() => {
		if (!isReturn) {
			return;
		}
		const timer = window.setTimeout(() => setIsWindowOver(true), CONFIRMATION_POLL_LIMIT_MS);
		return () => window.clearTimeout(timer);
	}, [isReturn]);
	return isReturn && !isWindowOver;
}

/** The invoice a link opens. */
function SharedInvoiceView({ id, token, isReturn }: Readonly<{ id: string; token: string; isReturn: boolean }>) {
	const t = useTranslations();
	const locale = useLocale();
	const { invoice, payOption } = useSharedInvoice(id, token, isReturn);
	const isConfirmingPayment = useIsConfirmingPayment(isReturn);
	const timeZone = null;
	const todayKey = todayDayKey(timeZone);

	if (invoice.isPending) {
		return <SharedInvoiceLoading />;
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
	// Back from the provider, a second Pay would ask the client to pay again while the first payment is confirmed
	const canPay = Boolean(option?.payable) && typeof option?.amountDue === 'number' && !isPaid && !isConfirmingPayment;
	// Whether Pay is offered could not be read: said, with a retry. An API without online payments answers 404, which
	// is no failure: the page offers no Pay there.
	const hasPayOptionFailed = payOption.isError && errorStatusOf(payOption.error) !== 404 && !isPaid;
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
					{hasPayOptionFailed && (
						<div className="flex flex-col items-stretch gap-2 sm:items-end">
							<Button
								type="button"
								onClick={() => void payOption.refetch()}
								disabled={payOption.isFetching}
								className="min-w-40"
							>
								{t('pages.unauthorized.TRY_AGAIN')}
							</Button>
							<p role="alert" className="text-xs text-destructive">
								{t('invoices.shared.PAY_FAILED')}
							</p>
						</div>
					)}
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
