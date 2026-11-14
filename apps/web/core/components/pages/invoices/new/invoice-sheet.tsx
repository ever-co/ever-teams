'use client';

import { Fragment, memo, type ReactNode } from 'react';
import { useLocale, useTranslations, type DottedLanguageObjectStringPaths } from 'next-intl';
import { BlockEmptyMessage } from '@/core/components/dashboards/kit/dashboard-states';
import { Button } from '@/core/components/duplicated-components/_button';
import { Folder, Undo, X } from '@/core/components/icons';
import {
	InvoicePaper,
	PaperGroup,
	PaperHead,
	PaperLine,
	PaperLines,
	PaperNote,
	PaperParties,
	PaperTotals,
	type PaperFact,
	type PaperTotalRow
} from '@/core/components/invoices/invoice-paper';
import type { InvoiceDraftState } from '@/core/hooks/invoices/use-new-invoice';
import { formatOwed } from '@/core/lib/utils/dashboards/payments-due';
import type { DurationRoundingDirection, DurationRoundingRule } from '@/core/lib/utils/duration-rounding';
import { formatPercent } from '@/core/lib/utils/invoice-totals';
import {
	formatInvoiceHours,
	invoiceDayTextOf,
	invoicePeriodTextOf,
	type InvoiceLineRateSource,
	type InvoiceProjectGroup,
	type NamedInvoiceLine
} from '@/core/lib/utils/invoices';
import { QUIET_FIELD } from './new-invoice-recipes';

type Translate = ReturnType<typeof useTranslations>;

const RATE_SOURCE_KEYS: Record<InvoiceLineRateSource, DottedLanguageObjectStringPaths> = {
	member: 'invoices.new.RATE_SOURCE_MEMBER',
	project: 'invoices.new.RATE_SOURCE_PROJECT',
	employee: 'invoices.new.RATE_SOURCE_EMPLOYEE',
	saved: 'invoices.edit.RATE_SOURCE_SAVED'
};

const ROUNDING_NOTE_KEYS: Record<DurationRoundingDirection, DottedLanguageObjectStringPaths> = {
	UP: 'invoices.new.ROUNDED_UP',
	DOWN: 'invoices.new.ROUNDED_DOWN',
	NEAREST: 'invoices.new.ROUNDED_NEAREST'
};

/** Lines built from time say the workspace rounded each entry, and how; saved lines are what was saved. */
function RoundingNote({ rule }: Readonly<{ rule: DurationRoundingRule | null }>) {
	const t = useTranslations();
	if (!rule) {
		return null;
	}
	return (
		<p className="text-xs tabular-nums text-muted-foreground">
			{t(ROUNDING_NOTE_KEYS[rule.direction], { minutes: rule.intervalMinutes })}
		</p>
	);
}

interface LineRowProps {
	line: NamedInvoiceLine;
	description: string | undefined;
	onDescribe: (lineKey: string, description: string) => void;
	onRemove: (lineKey: string) => void;
}

/** A line of the paper: its description is written in place, as the API's PDF will print it. */
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
	let detail: ReactNode;
	if (line.isAverageRate) {
		detail = <span title={rateHint}>{t('invoices.new.byProject.AVERAGE_RATE')}</span>;
	}
	return (
		<PaperLine
			description={
				<span className="-ml-2.5 flex min-w-0 items-center gap-1">
					<input
						type="text"
						value={description ?? line.label}
						placeholder={line.label}
						aria-label={t('invoices.new.DESCRIPTION_OF', { name: line.label })}
						onChange={(event) => onDescribe(line.key, event.target.value)}
						className={QUIET_FIELD}
					/>
					<Button
						type="button"
						variant="ghost"
						size="icon-sm"
						aria-label={removeLabel}
						title={removeLabel}
						onClick={() => onRemove(line.key)}
						className="shrink-0 text-muted-foreground"
					>
						<X />
					</Button>
				</span>
			}
			detail={detail}
			hours={hoursText}
			rate={<span title={rateHint}>{rateText}</span>}
			amount={formatOwed(line.amount, line.currency, locale)}
		/>
	);
});

interface LinesProps {
	invoice: InvoiceDraftState;
}

function ProjectBand({ group, currency }: Readonly<{ group: InvoiceProjectGroup; currency: string | null }>) {
	const t = useTranslations();
	const locale = useLocale();
	const hoursText = t('invoices.new.HOURS', { hours: formatInvoiceHours(group.hours, locale) });
	return (
		<PaperGroup
			label={
				<span className="flex min-w-0 items-center gap-2">
					<Folder aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
					<span className="truncate">{group.projectName}</span>
				</span>
			}
			meta={`${hoursText} · ${formatOwed(group.amount, currency, locale)}`}
		/>
	);
}

/** By project, a line is a whole project; by member or by task, the lines of a project follow its band. */
function SheetLines({ invoice }: Readonly<LinesProps>) {
	const t = useTranslations();
	const labels = {
		description: t('invoices.detail.COLUMN_DESCRIPTION'),
		hours: t('invoices.detail.COLUMN_HOURS'),
		rate: t('invoices.detail.COLUMN_RATE'),
		amount: t('invoices.detail.COLUMN_AMOUNT')
	};
	const rowOf = (line: NamedInvoiceLine) => (
		<LineRow
			key={line.key}
			line={line}
			description={invoice.descriptions.get(line.key)}
			onDescribe={invoice.describeLine}
			onRemove={invoice.removeLine}
		/>
	);
	if (invoice.grouping === 'project') {
		return <PaperLines labels={labels}>{invoice.keptLines.map(rowOf)}</PaperLines>;
	}
	return (
		<PaperLines labels={labels}>
			{invoice.groups.map((group) => (
				<Fragment key={group.projectId}>
					<ProjectBand group={group} currency={invoice.currency} />
					{group.lines.map(rowOf)}
				</Fragment>
			))}
		</PaperLines>
	);
}

function SheetNote({ children, action }: Readonly<{ children: ReactNode; action: ReactNode }>) {
	return (
		<p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
			<span className="tabular-nums">{children}</span>
			{action}
		</p>
	);
}

function UndoButton({ label, onClick }: Readonly<{ label: string; onClick: () => void }>) {
	return (
		<Button type="button" variant="ghost" size="sm" onClick={onClick} className="-my-1 text-foreground">
			<Undo />
			{label}
		</Button>
	);
}

/** A discount is written as what it takes off; none written as zero, never as "-0.00". */
function takenOffOf(amount: number) {
	if (amount > 0) {
		return -amount;
	}
	return 0;
}

function totalRowsOf(invoice: InvoiceDraftState, locale: string, t: Translate): PaperTotalRow[] {
	const { totals, adjustments, currency } = invoice;
	const amountText = (amount: number) => formatOwed(amount, currency, locale);
	const rows: PaperTotalRow[] = [];
	if (invoice.hasAdjustments) {
		rows.push({
			key: 'subtotal',
			label: t('invoices.new.adjustments.SUBTOTAL'),
			value: amountText(totals.subtotal)
		});
	}
	if (adjustments.discountPercent !== null) {
		const percent = formatPercent(adjustments.discountPercent, locale);
		rows.push({
			key: 'discount',
			label: t('invoices.new.adjustments.DISCOUNT_ROW', { percent }),
			value: amountText(takenOffOf(totals.discount))
		});
	}
	if (adjustments.taxPercent !== null) {
		const percent = formatPercent(adjustments.taxPercent, locale);
		const base = amountText(totals.discounted);
		rows.push({
			key: 'tax',
			label: t('invoices.new.adjustments.TAX_ROW', { percent, base }),
			value: amountText(totals.tax)
		});
	}
	rows.push({ key: 'total', label: t('invoices.new.TOTAL'), value: amountText(invoice.total), isTotal: true });
	return rows;
}

function headFactsOf(invoice: InvoiceDraftState, locale: string, t: Translate): PaperFact[] {
	const facts: PaperFact[] = [];
	const issuedText = invoiceDayTextOf(invoice.issueDay, locale);
	if (issuedText) {
		facts.push({ key: 'issued', label: t('invoices.new.details.ISSUE_DATE'), value: issuedText });
	}
	const dueText = invoiceDayTextOf(invoice.dueDay, locale);
	if (dueText) {
		facts.push({ key: 'due', label: t('invoices.new.details.DUE_DATE'), value: dueText });
	}
	const periodText = invoicePeriodTextOf(invoice.periodDays, locale);
	if (periodText) {
		facts.push({ key: 'period', label: t('invoices.new.PERIOD'), value: periodText });
	}
	return facts;
}

export function InvoiceSheet({ invoice }: Readonly<{ invoice: InvoiceDraftState }>) {
	const t = useTranslations();
	const locale = useLocale();
	const hasLines = invoice.groups.length > 0;
	const hasRemovedLines = invoice.removedCount > 0;
	const isSavedInvoice = invoice.savedInvoice !== null;
	const showsTimeLines = isSavedInvoice && invoice.linesSource === 'time';
	const totalHours = formatInvoiceHours(invoice.keptHours, locale);
	let roundingRule: DurationRoundingRule | null = null;
	if (invoice.linesSource === 'time') {
		roundingRule = invoice.time.roundingRule;
	}
	const note = invoice.note.trim();
	let numberText = '';
	if (invoice.numberText) {
		numberText = t('invoices.NUMBER', { number: invoice.numberText });
	}
	let emptyMessage = t('invoices.new.NO_PRICED_LINES');
	if (hasRemovedLines) {
		emptyMessage = t('invoices.new.ALL_LINES_REMOVED');
	}
	const clientLines: string[] = [];
	const clientEmail = invoice.client?.primaryEmail?.trim();
	if (clientEmail) {
		clientLines.push(clientEmail);
	}

	return (
		<section aria-label={t('invoices.new.SHEET_LABEL')}>
			<InvoicePaper>
				<PaperHead
					sender={invoice.organizationName}
					title={t('invoices.detail.PAPER_TITLE')}
					number={numberText}
					facts={headFactsOf(invoice, locale, t)}
				/>
				<PaperParties
					parties={[
						{ key: 'from', label: t('invoices.new.FROM'), name: invoice.organizationName },
						{
							key: 'to',
							label: t('invoices.new.BILL_TO'),
							name: invoice.client?.name ?? '',
							lines: clientLines
						}
					]}
				/>
				{hasLines && <SheetLines invoice={invoice} />}
				{!hasLines && <BlockEmptyMessage title={t('invoices.new.NO_LINES_TITLE')} message={emptyMessage} />}
				{showsTimeLines && (
					<SheetNote
						action={
							<UndoButton label={t('invoices.edit.BACK_TO_SAVED')} onClick={invoice.backToSavedLines} />
						}
					>
						{t('invoices.edit.TIME_LINES')}
					</SheetNote>
				)}
				{hasRemovedLines && (
					<SheetNote
						action={<UndoButton label={t('invoices.new.RESTORE_LINES')} onClick={invoice.restoreLines} />}
					>
						{t('invoices.new.REMOVED_LINES', { count: invoice.removedCount })}
					</SheetNote>
				)}
				{hasLines && (
					<div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
						<div className="flex flex-col gap-0.5">
							<p className="text-xs tabular-nums text-muted-foreground">
								{t('invoices.new.LINES_AND_HOURS', {
									count: invoice.keptLines.length,
									hours: totalHours
								})}
							</p>
							<RoundingNote rule={roundingRule} />
						</div>
						<PaperTotals rows={totalRowsOf(invoice, locale, t)} />
					</div>
				)}
				{note && <PaperNote label={t('invoices.new.terms.NOTE')}>{note}</PaperNote>}
			</InvoicePaper>
		</section>
	);
}
