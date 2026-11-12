'use client';

import { memo, type ReactNode } from 'react';
import { useLocale, useTranslations, type DottedLanguageObjectStringPaths } from 'next-intl';
import { BlockEmptyMessage } from '@/core/components/dashboards/kit/dashboard-states';
import { DASHBOARD_SURFACE } from '@/core/components/dashboards/kit/recipes';
import { Button } from '@/core/components/duplicated-components/_button';
import { Folder, Undo, X } from '@/core/components/icons';
import type { NewInvoiceState } from '@/core/hooks/invoices/use-new-invoice';
import { cn } from '@/core/lib/helpers';
import { formatOwed } from '@/core/lib/utils/dashboards/payments-due';
import { formatPercent } from '@/core/lib/utils/invoice-totals';
import {
	formatInvoiceHours,
	invoicePeriodTextOf,
	type InvoiceProjectGroup,
	type InvoiceRateSource,
	type NamedInvoiceLine
} from '@/core/lib/utils/invoices';
import { LINE_GRID, QUIET_FIELD } from './new-invoice-recipes';

const RATE_SOURCE_KEYS: Record<InvoiceRateSource, DottedLanguageObjectStringPaths> = {
	member: 'invoices.new.RATE_SOURCE_MEMBER',
	project: 'invoices.new.RATE_SOURCE_PROJECT',
	employee: 'invoices.new.RATE_SOURCE_EMPLOYEE'
};

const FIGURE = 'whitespace-nowrap text-[13px] tabular-nums';

function Party({ label, name, detail }: Readonly<{ label: string; name: string; detail?: string | null }>) {
	return (
		<div className="flex min-w-0 flex-col gap-0.5">
			<span className="text-xs text-muted-foreground">{label}</span>
			<span className="truncate text-sm font-medium text-foreground">{name}</span>
			{detail && <span className="truncate text-xs text-muted-foreground">{detail}</span>}
		</div>
	);
}

interface LineRowProps {
	line: NamedInvoiceLine;
	description: string | undefined;
	onDescribe: (lineKey: string, description: string) => void;
	onRemove: (lineKey: string) => void;
}

const LineRow = memo(function LineRow({ line, description, onDescribe, onRemove }: LineRowProps) {
	const t = useTranslations();
	const locale = useLocale();
	const hoursText = t('invoices.new.HOURS', { hours: formatInvoiceHours(line.hours, locale) });
	const rateText = t('invoices.new.RATE_PER_HOUR', { rate: formatOwed(line.rate, line.currency, locale) });
	const removeLabel = t('invoices.new.REMOVE_LINE', { name: line.label });
	let rateHint = t(RATE_SOURCE_KEYS[line.rateSource]);
	if (line.isAverageRate) {
		rateHint = t('invoices.new.byProject.AVERAGE_RATE_HINT');
	}
	return (
		<li className={LINE_GRID}>
			<input
				type="text"
				value={description ?? line.label}
				placeholder={line.label}
				aria-label={t('invoices.new.DESCRIPTION_OF', { name: line.label })}
				onChange={(event) => onDescribe(line.key, event.target.value)}
				className={cn(QUIET_FIELD, 'col-span-full lg:col-span-1')}
			/>
			<span className={cn(FIGURE, 'text-foreground lg:text-right')}>{hoursText}</span>
			<span className={cn(FIGURE, 'flex flex-col text-muted-foreground lg:items-end')} title={rateHint}>
				<span>{rateText}</span>
				{line.isAverageRate && (
					<span className="text-[11px] leading-4 font-medium">
						{t('invoices.new.byProject.AVERAGE_RATE')}
					</span>
				)}
			</span>
			<span className={cn(FIGURE, 'text-right font-medium text-foreground')}>
				{formatOwed(line.amount, line.currency, locale)}
			</span>
			<Button
				type="button"
				variant="ghost"
				size="icon-sm"
				aria-label={removeLabel}
				title={removeLabel}
				onClick={() => onRemove(line.key)}
				className="text-muted-foreground"
			>
				<X />
			</Button>
		</li>
	);
});

function ProjectLines({
	group,
	currency,
	descriptions,
	onDescribe,
	onRemove
}: Readonly<{
	group: InvoiceProjectGroup;
	currency: string | null;
	descriptions: ReadonlyMap<string, string>;
	onDescribe: (lineKey: string, description: string) => void;
	onRemove: (lineKey: string) => void;
}>) {
	const t = useTranslations();
	const locale = useLocale();
	const hoursText = t('invoices.new.HOURS', { hours: formatInvoiceHours(group.hours, locale) });
	return (
		<li className="flex flex-col gap-2.5">
			<div className="flex items-center justify-between gap-3 rounded-lg bg-foreground/[0.03] px-3 py-2">
				<span className="flex min-w-0 items-center gap-2">
					<Folder aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
					<span className="truncate text-[13px] font-medium text-foreground">{group.projectName}</span>
				</span>
				<span className="shrink-0 text-xs tabular-nums text-muted-foreground">
					{hoursText} · {formatOwed(group.amount, currency, locale)}
				</span>
			</div>
			<ul className="flex flex-col gap-3 px-3 lg:gap-1.5">
				{group.lines.map((line) => (
					<LineRow
						key={line.key}
						line={line}
						description={descriptions.get(line.key)}
						onDescribe={onDescribe}
						onRemove={onRemove}
					/>
				))}
			</ul>
		</li>
	);
}

/** By project, a line is a whole project: the lines are listed without a band per project. */
function SheetLines({ invoice }: Readonly<{ invoice: NewInvoiceState }>) {
	if (invoice.grouping === 'project') {
		return (
			<ul className="flex flex-col gap-3 px-3 lg:gap-1.5">
				{invoice.keptLines.map((line) => (
					<LineRow
						key={line.key}
						line={line}
						description={invoice.descriptions.get(line.key)}
						onDescribe={invoice.describeLine}
						onRemove={invoice.removeLine}
					/>
				))}
			</ul>
		);
	}
	return (
		<ul className="flex flex-col gap-5">
			{invoice.groups.map((group) => (
				<ProjectLines
					key={group.projectId}
					group={group}
					currency={invoice.currency}
					descriptions={invoice.descriptions}
					onDescribe={invoice.describeLine}
					onRemove={invoice.removeLine}
				/>
			))}
		</ul>
	);
}

function RemovedLines({ count, onRestore }: Readonly<{ count: number; onRestore: () => void }>) {
	const t = useTranslations();
	return (
		<p className="flex flex-wrap items-center gap-x-2 gap-y-1 px-3 text-xs text-muted-foreground">
			<span className="tabular-nums">{t('invoices.new.REMOVED_LINES', { count })}</span>
			<Button type="button" variant="ghost" size="sm" onClick={onRestore} className="-my-1 text-foreground">
				<Undo />
				{t('invoices.new.RESTORE_LINES')}
			</Button>
		</p>
	);
}

/** A discount is written as what it takes off; none written as zero, never as "-0.00". */
function takenOffOf(amount: number) {
	if (amount > 0) {
		return -amount;
	}
	return 0;
}

function AdjustmentRow({ label, value }: Readonly<{ label: string; value: string }>) {
	return (
		<>
			<dt className="text-muted-foreground">{label}</dt>
			<dd className="text-right text-foreground">{value}</dd>
		</>
	);
}

/** Subtotal, discount and tax, the tax with what it is taken of, so the reader can follow the total. */
function AdjustedSubtotal({ invoice }: Readonly<{ invoice: NewInvoiceState }>) {
	const t = useTranslations();
	const locale = useLocale();
	const { totals, adjustments, currency } = invoice;
	const { discountPercent, taxPercent } = adjustments;
	const amountText = (amount: number) => formatOwed(amount, currency, locale);
	const discountTakenOff = takenOffOf(totals.discount);
	let discountRow: ReactNode = null;
	if (discountPercent !== null) {
		const percent = formatPercent(discountPercent, locale);
		const label = t('invoices.new.adjustments.DISCOUNT_ROW', { percent });
		discountRow = <AdjustmentRow label={label} value={amountText(discountTakenOff)} />;
	}
	let taxRow: ReactNode = null;
	if (taxPercent !== null) {
		const percent = formatPercent(taxPercent, locale);
		const base = amountText(totals.discounted);
		const label = t('invoices.new.adjustments.TAX_ROW', { percent, base });
		taxRow = <AdjustmentRow label={label} value={amountText(totals.tax)} />;
	}
	return (
		<dl className="grid grid-cols-[auto_auto] gap-x-6 gap-y-1 text-[13px] tabular-nums">
			<AdjustmentRow label={t('invoices.new.adjustments.SUBTOTAL')} value={amountText(totals.subtotal)} />
			{discountRow}
			{taxRow}
		</dl>
	);
}

/** The API's PDF prints these lines as they are written here: description, hours, rate and amount. */
export function InvoiceSheet({ invoice }: Readonly<{ invoice: NewInvoiceState }>) {
	const t = useTranslations();
	const locale = useLocale();
	const hasLines = invoice.groups.length > 0;
	const hasRemovedLines = invoice.removedCount > 0;
	const periodText = invoicePeriodTextOf(invoice.periodDays, locale) ?? '';
	const totalHours = formatInvoiceHours(invoice.keptHours, locale);
	let emptyMessage = t('invoices.new.NO_PRICED_LINES');
	if (hasRemovedLines) {
		emptyMessage = t('invoices.new.ALL_LINES_REMOVED');
	}

	return (
		<section
			aria-label={t('invoices.new.SHEET_LABEL')}
			className={cn(DASHBOARD_SURFACE, 'flex flex-col gap-6 p-4 sm:p-6')}
		>
			<header className="grid grid-cols-1 gap-4 sm:grid-cols-3">
				<Party label={t('invoices.new.FROM')} name={invoice.organizationName} />
				<Party
					label={t('invoices.new.BILL_TO')}
					name={invoice.client?.name ?? ''}
					detail={invoice.client?.primaryEmail}
				/>
				<Party label={t('invoices.new.PERIOD')} name={periodText} />
			</header>

			{hasLines && <SheetLines invoice={invoice} />}
			{!hasLines && <BlockEmptyMessage title={t('invoices.new.NO_LINES_TITLE')} message={emptyMessage} />}
			{hasRemovedLines && <RemovedLines count={invoice.removedCount} onRestore={invoice.restoreLines} />}

			{hasLines && (
				<footer className="flex flex-wrap items-end justify-between gap-4 px-3">
					<p className="text-xs tabular-nums text-muted-foreground">
						{t('invoices.new.LINES_AND_HOURS', { count: invoice.keptLines.length, hours: totalHours })}
					</p>
					<div className="ml-auto flex flex-col items-end gap-3">
						{invoice.hasAdjustments && <AdjustedSubtotal invoice={invoice} />}
						<div className="flex flex-col items-end gap-0.5">
							<span className="text-xs text-muted-foreground">{t('invoices.new.TOTAL')}</span>
							<span className="text-2xl font-semibold tabular-nums text-foreground">
								{formatOwed(invoice.total, invoice.currency, locale)}
							</span>
						</div>
					</div>
				</footer>
			)}
		</section>
	);
}
