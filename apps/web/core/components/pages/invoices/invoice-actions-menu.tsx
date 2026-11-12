'use client';

import type { ReactNode } from 'react';
import { Menu, MenuButton, MenuItem, MenuItems, MenuSeparator } from '@headlessui/react';
import { useTranslations, type DottedLanguageObjectStringPaths } from 'next-intl';
import { CircleCheck, CircleX, Loader, MoreHorizontal, Send, Trash, Undo } from '@/core/components/icons';
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
import { invoiceActionsOf, isDraftInvoice, type InvoiceAction } from '@/core/lib/utils/invoice-actions';
import { invoiceStatusOf, type InvoiceStatus } from '@/core/lib/utils/invoices';
import type { TInvoice } from '@/core/types/schemas/organization/invoice.schema';

const ACTION_ICONS: Record<InvoiceAction, ReactNode> = {
	send: <Send />,
	markPaid: <CircleCheck />,
	markUnpaid: <Undo />,
	void: <CircleX />,
	delete: <Trash />
};

const ACTION_LABEL_KEYS: Record<InvoiceAction, DottedLanguageObjectStringPaths> = {
	send: 'invoices.actions.SEND_AGAIN',
	markPaid: 'invoices.actions.MARK_PAID',
	markUnpaid: 'invoices.actions.MARK_UNPAID',
	void: 'invoices.actions.VOID',
	delete: 'invoices.actions.DELETE'
};

/** Voiding and deleting end an invoice: they sit apart, after a hairline, the destructive one last. */
const ENDING_ACTIONS: ReadonlySet<InvoiceAction> = new Set(['void', 'delete']);

function labelKeyOf(action: InvoiceAction, status: InvoiceStatus | null): DottedLanguageObjectStringPaths {
	const isFirstSending = action === 'send' && isDraftInvoice(status);
	if (isFirstSending) {
		return 'invoices.actions.SEND';
	}
	return ACTION_LABEL_KEYS[action];
}

interface ActionRowProps {
	action: InvoiceAction;
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

interface InvoiceActionsMenuProps {
	invoice: TInvoice;
	numberText: string;
	isChanging: boolean;
	onAction: (invoice: TInvoice, action: InvoiceAction) => void;
}

/** What can be done with one invoice in its status; nothing is rendered when there is nothing. */
export function InvoiceActionsMenu({ invoice, numberText, isChanging, onAction }: Readonly<InvoiceActionsMenuProps>) {
	const t = useTranslations();
	const status = invoiceStatusOf(invoice.status);
	const actions = invoiceActionsOf(status);
	const leadingActions = actions.filter((action) => !ENDING_ACTIONS.has(action));
	const endingActions = actions.filter((action) => ENDING_ACTIONS.has(action));
	const hasLeading = leadingActions.length > 0;
	const hasEnding = endingActions.length > 0;
	const showsSeparator = hasLeading && hasEnding;
	if (actions.length === 0) {
		return null;
	}
	const rowOf = (action: InvoiceAction) => (
		<ActionRow
			key={action}
			action={action}
			label={t(labelKeyOf(action, status))}
			onSelect={() => onAction(invoice, action)}
		/>
	);
	return (
		<Menu as="div" className="relative inline-flex shrink-0">
			<MenuButton
				aria-label={t('invoices.actions.MENU_LABEL', { number: numberText })}
				disabled={isChanging}
				className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'text-muted-foreground')}
			>
				{isChanging && <Loader className="animate-spin" />}
				{!isChanging && <MoreHorizontal />}
			</MenuButton>
			<MenuItems anchor={MENU_ANCHOR} transition className={cn(MENU_SURFACE, MENU_ANCHORED_PANEL)}>
				{leadingActions.map(rowOf)}
				{showsSeparator && <MenuSeparator className={MENU_SEPARATOR} />}
				{endingActions.map(rowOf)}
			</MenuItems>
		</Menu>
	);
}
