'use client';

import { memo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { CircleAlert } from '@/core/components/icons';
import { cn } from '@/core/lib/helpers';
import { daysUntilDue, dueDayOf, invoiceStandingOf, type StandingInvoice } from '@/core/lib/utils/invoice-standing';
import { invoiceDayTextOf } from '@/core/lib/utils/invoices';

interface InvoiceDueTextProps {
	invoice: Pick<StandingInvoice, 'status' | 'dueDate'>;
	todayKey: string;
	timeZone: string | null | undefined;
	className?: string;
}

const DUE_TEXT = 'truncate text-[13px] tabular-nums';

/**
 * When an invoice is due, said the way it matters today: "Due in 5 days", "Due today", "12 days late" while it is
 * owed; its day, muted, once it is a draft, paid or void. Late reads in the destructive ink with its glyph, so it reads
 * without colour too.
 */
export const InvoiceDueText = memo(function InvoiceDueText({
	invoice,
	todayKey,
	timeZone,
	className
}: InvoiceDueTextProps) {
	const t = useTranslations();
	const locale = useLocale();
	const dueDay = dueDayOf(invoice, timeZone);
	if (!dueDay) {
		return <span className={cn(DUE_TEXT, 'text-muted-foreground', className)}>{t('invoices.NO_DUE_DATE')}</span>;
	}
	const standing = invoiceStandingOf(invoice, todayKey, timeZone);
	const isOwed = standing === 'open' || standing === 'overdue';
	const days = daysUntilDue(dueDay, todayKey);
	const hasDays = days !== null;
	if (!isOwed || !hasDays) {
		const dayText = invoiceDayTextOf(dueDay, locale) ?? dueDay;
		return <span className={cn(DUE_TEXT, 'text-muted-foreground', className)}>{dayText}</span>;
	}
	if (days < 0) {
		const lateDays = -days;
		return (
			<span className={cn(DUE_TEXT, 'inline-flex items-center gap-1 text-destructive-ink', className)}>
				<CircleAlert aria-hidden="true" className="size-3.5 shrink-0" />
				{t('invoices.due.LATE', { count: lateDays })}
			</span>
		);
	}
	if (days === 0) {
		return <span className={cn(DUE_TEXT, 'text-warning-foreground', className)}>{t('invoices.due.TODAY')}</span>;
	}
	if (days === 1) {
		return <span className={cn(DUE_TEXT, 'text-foreground', className)}>{t('invoices.due.TOMORROW')}</span>;
	}
	return (
		<span className={cn(DUE_TEXT, 'text-foreground', className)}>{t('invoices.due.IN_DAYS', { count: days })}</span>
	);
});
