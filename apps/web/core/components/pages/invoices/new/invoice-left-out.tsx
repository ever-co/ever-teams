'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { DashboardSection } from '@/core/components/dashboards/kit/dashboard-layout';
import { Button } from '@/core/components/duplicated-components/_button';
import type { NamedUnpricedTime } from '@/core/hooks/invoices/use-invoice-time';
import { decimalHoursOf, formatOwed } from '@/core/lib/utils/dashboards/payments-due';
import { formatInvoiceHours, type InvoiceCurrencyTotal } from '@/core/lib/utils/invoices';
import { QUIET_LINK } from './new-invoice-recipes';

const NOTE = 'px-4 text-xs text-muted-foreground text-pretty';

const ROW = 'flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2';

const ROW_FIGURES = 'text-[13px] tabular-nums text-foreground';

function CurrencyRow({
	total,
	onInvoice
}: Readonly<{ total: InvoiceCurrencyTotal; onInvoice: (currencyKey: string) => void }>) {
	const t = useTranslations();
	const locale = useLocale();
	const currency = total.currency;
	const hoursText = t('invoices.new.HOURS', { hours: formatInvoiceHours(total.hours, locale) });
	// An invoice states its currency: time that has none cannot make one, so it is never offered as the invoice.
	let invoiceAction = <span className="text-xs text-muted-foreground">{t('invoices.new.NO_CURRENCY')}</span>;
	if (currency) {
		invoiceAction = (
			<Button type="button" variant="outline" size="sm" onClick={() => onInvoice(total.key)}>
				{t('invoices.new.otherCurrencies.SWITCH', { currency })}
			</Button>
		);
	}
	return (
		<li className={ROW}>
			<span className="flex min-w-0 flex-col">
				<span className={ROW_FIGURES}>
					{hoursText} · {formatOwed(total.amount, currency, locale)}
				</span>
				<span className="text-xs tabular-nums text-muted-foreground">
					{t('invoices.new.LINE_COUNT', { count: total.lineCount })}
				</span>
			</span>
			{invoiceAction}
		</li>
	);
}

export function OtherCurrencies({
	currencies,
	onInvoice
}: Readonly<{ currencies: ReadonlyArray<InvoiceCurrencyTotal>; onInvoice: (currencyKey: string) => void }>) {
	const t = useTranslations();
	if (currencies.length === 0) {
		return null;
	}
	return (
		<DashboardSection title={t('invoices.new.otherCurrencies.TITLE')} bodyClassName="flex flex-col gap-1 pb-3">
			<p className={NOTE}>{t('invoices.new.otherCurrencies.NOTE')}</p>
			<ul className="flex flex-col">
				{currencies.map((total) => (
					<CurrencyRow key={total.key} total={total} onInvoice={onInvoice} />
				))}
			</ul>
		</DashboardSection>
	);
}

function UnpricedRow({ item }: Readonly<{ item: NamedUnpricedTime }>) {
	const t = useTranslations();
	const locale = useLocale();
	const hours = formatInvoiceHours(decimalHoursOf(item.seconds), locale);
	const projectPeoplePath = `/projects/${encodeURIComponent(item.projectId)}?tab=people`;
	return (
		<li className={ROW}>
			<span className="flex min-w-0 flex-col">
				<span className="truncate text-[13px] font-medium text-foreground">{item.memberName}</span>
				<span className="truncate text-xs text-muted-foreground">{item.projectName}</span>
			</span>
			<span className="flex items-center gap-4">
				<span className={ROW_FIGURES}>{t('invoices.new.HOURS', { hours })}</span>
				<Link
					href={projectPeoplePath}
					aria-label={t('invoices.new.unpriced.SET_RATE_OF', {
						member: item.memberName,
						project: item.projectName
					})}
					className={QUIET_LINK}
				>
					{t('invoices.new.unpriced.SET_RATE')}
				</Link>
			</span>
		</li>
	);
}

export function UnpricedTimeList({ items }: Readonly<{ items: ReadonlyArray<NamedUnpricedTime> }>) {
	const t = useTranslations();
	if (items.length === 0) {
		return null;
	}
	return (
		<DashboardSection title={t('invoices.new.unpriced.TITLE')} bodyClassName="flex flex-col gap-1 pb-3">
			<p className={NOTE}>{t('invoices.new.unpriced.NOTE')}</p>
			<ul className="flex flex-col">
				{items.map((item) => (
					<UnpricedRow key={item.key} item={item} />
				))}
			</ul>
		</DashboardSection>
	);
}
