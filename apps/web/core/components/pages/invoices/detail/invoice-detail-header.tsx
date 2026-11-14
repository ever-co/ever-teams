'use client';

import Link from 'next/link';
import { useTranslations, type DottedLanguageObjectStringPaths } from 'next-intl';
import { EntityTile } from '@/core/components/common/entity-tile';
import { Button } from '@/core/components/duplicated-components/_button';
import { Download, Loader } from '@/core/components/icons';
import { InvoiceDueText } from '@/core/components/invoices/invoice-due-text';
import { InvoiceStandingLabel } from '@/core/components/invoices/invoice-standing';
import { clientPagePathOf } from '@/core/lib/utils/clients';
import { nextInvoiceActionOf, type InvoiceMenuAction, type NextInvoiceAction } from '@/core/lib/utils/invoice-actions';
import { invoiceStatusOf } from '@/core/lib/utils/invoices';
import type { TSavedInvoice } from '@/core/types/schemas/organization/invoice.schema';
import { InvoiceActionsMenu } from '../invoice-actions-menu';

const NEXT_ACTION_LABEL_KEYS: Record<NextInvoiceAction, DottedLanguageObjectStringPaths> = {
	send: 'invoices.actions.SEND',
	markPaid: 'invoices.actions.MARK_PAID'
};

const NO_OMITTED_ACTIONS: ReadonlyArray<InvoiceMenuAction> = [];

interface InvoiceDetailHeaderProps {
	invoice: TSavedInvoice;
	numberText: string | null;
	clientName: string;
	todayKey: string;
	timeZone: string | null | undefined;
	canEdit: boolean;
	canRevise: boolean;
	isChanging: boolean;
	isDownloading: boolean;
	onDownload: () => void;
	onAction: (action: InvoiceMenuAction) => void;
}

function ClientLink({ invoice, clientName }: Readonly<{ invoice: TSavedInvoice; clientName: string }>) {
	const clientId = invoice.toContactId;
	const tile = <EntityTile name={clientName} imageUrl={invoice.toContact?.imageUrl} className="size-5 text-[9px]" />;
	if (!clientId) {
		return (
			<span className="flex min-w-0 items-center gap-1.5">
				{tile}
				<span className="truncate">{clientName}</span>
			</span>
		);
	}
	return (
		<Link
			href={clientPagePathOf(clientId)}
			className="flex min-w-0 items-center gap-1.5 rounded-sm text-foreground/80 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
		>
			{tile}
			<span className="truncate">{clientName}</span>
		</Link>
	);
}

export function InvoiceDetailHeader({
	invoice,
	numberText,
	clientName,
	todayKey,
	timeZone,
	canEdit,
	canRevise,
	isChanging,
	isDownloading,
	onDownload,
	onAction
}: Readonly<InvoiceDetailHeaderProps>) {
	const t = useTranslations();
	const status = invoiceStatusOf(invoice.status);
	let nextAction: NextInvoiceAction | null = null;
	if (canEdit) {
		nextAction = nextInvoiceActionOf(status);
	}
	let omitted = NO_OMITTED_ACTIONS;
	if (nextAction) {
		omitted = [nextAction];
	}
	let heading = t('invoices.detail.PAPER_TITLE');
	if (numberText) {
		heading = t('invoices.detail.HEADING', { number: numberText });
	}

	return (
		<div className="px-4">
			<div className="flex min-h-16 flex-wrap items-center justify-between gap-x-6 gap-y-3 py-3">
				<div className="flex min-w-0 flex-col gap-1">
					<div className="flex min-w-0 items-center gap-2.5">
						<h1 className="truncate text-xl font-semibold text-foreground tabular-nums">{heading}</h1>
						<InvoiceStandingLabel
							invoice={invoice}
							todayKey={todayKey}
							timeZone={timeZone}
							variant="badge"
						/>
					</div>
					<div className="flex min-w-0 items-center gap-2 text-[13px] text-muted-foreground">
						<ClientLink invoice={invoice} clientName={clientName} />
						<span aria-hidden="true">·</span>
						<InvoiceDueText invoice={invoice} todayKey={todayKey} timeZone={timeZone} />
					</div>
				</div>
				<div className="flex items-center gap-2">
					{nextAction && (
						<Button
							type="button"
							variant="default"
							size="default"
							disabled={isChanging}
							onClick={() => onAction(nextAction)}
						>
							{t(NEXT_ACTION_LABEL_KEYS[nextAction])}
						</Button>
					)}
					<Button
						type="button"
						variant="outline"
						size="default"
						disabled={isDownloading}
						onClick={onDownload}
					>
						{isDownloading && <Loader className="animate-spin" />}
						{!isDownloading && <Download />}
						<span>{t('invoices.actions.DOWNLOAD')}</span>
					</Button>
					{canEdit && (
						<InvoiceActionsMenu
							invoice={invoice}
							numberText={numberText ?? ''}
							isChanging={isChanging}
							onAction={(_, action) => onAction(action)}
							canRevise={canRevise}
							omit={omitted}
							triggerVariant="outline"
						/>
					)}
				</div>
			</div>
		</div>
	);
}
