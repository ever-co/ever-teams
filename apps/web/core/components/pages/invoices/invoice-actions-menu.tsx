'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { Menu, MenuButton, MenuItem, MenuItems, MenuSeparator } from '@headlessui/react';
import { useTranslations, type DottedLanguageObjectStringPaths } from 'next-intl';
import {
	CircleCheck,
	CircleX,
	Download,
	Loader,
	MoreHorizontal,
	Pencil,
	Refresh,
	Send,
	Trash,
	Undo
} from '@/core/components/icons';
import { buttonVariants } from '@/core/components/duplicated-components/_button';
import {
	MENU_ANCHOR,
	MENU_ANCHORED_PANEL,
	MENU_ROW,
	MENU_ROW_DESTRUCTIVE,
	MENU_SEPARATOR,
	MENU_SURFACE
} from '@/core/components/common/menu-recipes';
import { cn } from '@/core/lib/helpers';
import {
	invoiceMenuActionsOf,
	isDraftInvoice,
	isRevisableInvoice,
	type InvoiceMenuAction
} from '@/core/lib/utils/invoice-actions';
import { invoiceStatusOf, type InvoiceStatus } from '@/core/lib/utils/invoices';
import type { TInvoice } from '@/core/types/schemas/organization/invoice.schema';
import { editInvoicePathOf } from './invoice-access-guard';

const ACTION_ICONS: Record<InvoiceMenuAction, ReactNode> = {
	edit: <Pencil />,
	send: <Send />,
	markPaid: <CircleCheck />,
	markUnpaid: <Undo />,
	void: <CircleX />,
	voidAndReplace: <Refresh />,
	delete: <Trash />
};

const ACTION_LABEL_KEYS: Record<InvoiceMenuAction, DottedLanguageObjectStringPaths> = {
	edit: 'common.EDIT',
	send: 'invoices.actions.SEND_AGAIN',
	markPaid: 'invoices.actions.MARK_PAID',
	markUnpaid: 'invoices.actions.MARK_UNPAID',
	void: 'invoices.actions.VOID',
	voidAndReplace: 'invoices.replace.ACTION',
	delete: 'invoices.actions.DELETE'
};

/** Voiding, replacing and deleting end an invoice: they sit apart, after a hairline, the destructive one last. */
const ENDING_ACTIONS: ReadonlySet<InvoiceMenuAction> = new Set(['void', 'voidAndReplace', 'delete']);

function labelKeyOf(action: InvoiceMenuAction, status: InvoiceStatus | null): DottedLanguageObjectStringPaths {
	const isFirstSending = action === 'send' && isDraftInvoice(status);
	if (isFirstSending) {
		return 'invoices.actions.SEND';
	}
	return ACTION_LABEL_KEYS[action];
}

interface ActionRowProps {
	action: InvoiceMenuAction;
	label: string;
	onSelect: () => void;
}

function ActionRow({ action, label, onSelect }: Readonly<ActionRowProps>) {
	const isDestructive = action === 'delete';
	return (
		<MenuItem>
			<button type="button" onClick={onSelect} className={cn(MENU_ROW, isDestructive && MENU_ROW_DESTRUCTIVE)}>
				{ACTION_ICONS[action]}
				<span>{label}</span>
			</button>
		</MenuItem>
	);
}

/** Edit opens the invoice screen: a link, so it can open in a tab of its own. */
function EditRow({ invoiceId }: Readonly<{ invoiceId: string }>) {
	const t = useTranslations();
	return (
		<MenuItem>
			<Link href={editInvoicePathOf(invoiceId)} className={MENU_ROW}>
				{ACTION_ICONS.edit}
				<span>{t(ACTION_LABEL_KEYS.edit)}</span>
			</Link>
		</MenuItem>
	);
}

function DownloadRow({ onSelect }: Readonly<{ onSelect: () => void }>) {
	const t = useTranslations();
	return (
		<MenuItem>
			<button type="button" onClick={onSelect} className={MENU_ROW}>
				<Download />
				<span>{t('invoices.actions.DOWNLOAD')}</span>
			</button>
		</MenuItem>
	);
}

export interface InvoiceMenuDownload {
	isPending: boolean;
	onSelect: () => void;
}

interface InvoiceActionsMenuProps {
	invoice: TInvoice;
	numberText: string;
	isChanging: boolean;
	onAction: (invoice: TInvoice, action: InvoiceMenuAction) => void;
	/** The PDF, first in the menu where the row has no room for its own download button. */
	download?: InvoiceMenuDownload;
	/** The role may rebuild invoices from billable time: edit them, or void and replace them. */
	canRevise?: boolean;
}

/** What can be done with one invoice in its status; nothing is rendered when there is nothing. */
export function InvoiceActionsMenu({
	invoice,
	numberText,
	isChanging,
	onAction,
	download,
	canRevise = false
}: Readonly<InvoiceActionsMenuProps>) {
	const t = useTranslations();
	const status = invoiceStatusOf(invoice.status);
	const mayRevise = canRevise && isRevisableInvoice(invoice);
	const actions = invoiceMenuActionsOf(status, mayRevise);
	const leadingActions = actions.filter((action) => !ENDING_ACTIONS.has(action));
	const endingActions = actions.filter((action) => ENDING_ACTIONS.has(action));
	const hasDownload = download !== undefined;
	const hasLeadingAction = leadingActions.length > 0;
	const hasLeading = hasLeadingAction || hasDownload;
	const hasEnding = endingActions.length > 0;
	const showsSeparator = hasLeading && hasEnding;
	const isDownloading = download?.isPending ?? false;
	const isBusy = isChanging || isDownloading;
	if (actions.length === 0) {
		return null;
	}
	const rowOf = (action: InvoiceMenuAction) => {
		if (action === 'edit') {
			return <EditRow key={action} invoiceId={invoice.id} />;
		}
		return (
			<ActionRow
				key={action}
				action={action}
				label={t(labelKeyOf(action, status))}
				onSelect={() => onAction(invoice, action)}
			/>
		);
	};
	return (
		<Menu as="div" className="relative inline-flex shrink-0">
			<MenuButton
				aria-label={t('invoices.actions.MENU_LABEL', { number: numberText })}
				disabled={isBusy}
				className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'text-muted-foreground')}
			>
				{isBusy && <Loader className="animate-spin" />}
				{!isBusy && <MoreHorizontal />}
			</MenuButton>
			<MenuItems anchor={MENU_ANCHOR} transition className={cn(MENU_SURFACE, MENU_ANCHORED_PANEL)}>
				{download && <DownloadRow onSelect={download.onSelect} />}
				{leadingActions.map(rowOf)}
				{showsSeparator && <MenuSeparator className={MENU_SEPARATOR} />}
				{endingActions.map(rowOf)}
			</MenuItems>
		</Menu>
	);
}
