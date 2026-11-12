import { isEmail } from 'class-validator';
import type { InvoiceStatus } from '@/core/lib/utils/invoices';

export type InvoiceAction = 'send' | 'markPaid' | 'markUnpaid' | 'void' | 'delete';

/**
 * What can be done with an invoice in each status. Only drafts are deleted, and money received is never undone here:
 * a paid invoice can be marked unpaid, while one paid in part or overpaid keeps what the API's payments recorded.
 */
const ACTIONS_BY_STATUS: Record<InvoiceStatus, ReadonlyArray<InvoiceAction>> = {
	DRAFT: ['send', 'markPaid', 'void', 'delete'],
	SENT: ['send', 'markPaid', 'void'],
	VIEWED: ['send', 'markPaid', 'void'],
	PARTIALLY_PAID: ['send', 'markPaid'],
	FULLY_PAID: ['send', 'markUnpaid'],
	OVERPAID: ['send'],
	VOID: []
};

const NO_ACTIONS: ReadonlyArray<InvoiceAction> = [];

export function invoiceActionsOf(status: InvoiceStatus | null): ReadonlyArray<InvoiceAction> {
	if (!status) {
		return NO_ACTIONS;
	}
	return ACTIONS_BY_STATUS[status];
}

/** A draft was never sent: sending makes it Sent. An invoice sent again keeps the status it reached since. */
export function isDraftInvoice(status: InvoiceStatus | null) {
	return status === 'DRAFT';
}

/** The fields the API's action route takes to change an invoice's status and what it says was paid. */
export interface InvoiceStatusChange {
	status: InvoiceStatus;
	paid?: boolean;
	alreadyPaid?: number;
	amountDue?: number;
}

export const SENT_CHANGE: Readonly<InvoiceStatusChange> = { status: 'SENT' };

export const VOID_CHANGE: Readonly<InvoiceStatusChange> = { status: 'VOID' };

function hasTotal(total: number | null | undefined): total is number {
	return typeof total === 'number';
}

export function paidChangeOf(total: number | null | undefined): InvoiceStatusChange {
	const change: InvoiceStatusChange = { status: 'FULLY_PAID', paid: true, amountDue: 0 };
	if (hasTotal(total)) {
		change.alreadyPaid = total;
	}
	return change;
}

export function unpaidChangeOf(total: number | null | undefined): InvoiceStatusChange {
	const change: InvoiceStatusChange = { status: 'SENT', paid: false, alreadyPaid: 0 };
	if (hasTotal(total)) {
		change.amountDue = total;
	}
	return change;
}

export function isInvoiceRecipient(email: string) {
	return isEmail(email.trim());
}

export interface ListedInvoicesPage<T> {
	items: T[];
	total: number;
}

interface Identified {
	id: string;
}

function changedItemOf<T extends Identified>(item: T, invoiceId: string, change: Partial<T>): T {
	if (item.id !== invoiceId) {
		return item;
	}
	return { ...item, ...change };
}

/** The pages of the list with one invoice changed in place, so the list shows its new state at once. */
export function pagesWithInvoiceChanged<T extends Identified>(
	pages: ReadonlyArray<ListedInvoicesPage<T>>,
	invoiceId: string,
	change: Partial<T>
): ListedInvoicesPage<T>[] {
	return pages.map((page) => {
		const items = page.items.map((item) => changedItemOf(item, invoiceId, change));
		return { ...page, items };
	});
}

function isOnPage<T extends Identified>(page: ListedInvoicesPage<T>, invoiceId: string) {
	return page.items.some((item) => item.id === invoiceId);
}

/** The pages of the list without a deleted invoice, the count of the list one lower. */
export function pagesWithoutInvoice<T extends Identified>(
	pages: ReadonlyArray<ListedInvoicesPage<T>>,
	invoiceId: string
): ListedInvoicesPage<T>[] {
	const isListed = pages.some((page) => isOnPage(page, invoiceId));
	if (!isListed) {
		return [...pages];
	}
	return pages.map((page) => {
		const items = page.items.filter((item) => item.id !== invoiceId);
		const total = Math.max(page.total - 1, 0);
		return { ...page, items, total };
	});
}
