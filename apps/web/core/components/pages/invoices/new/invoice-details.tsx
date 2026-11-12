'use client';

import { useId } from 'react';
import { useTranslations, type DottedLanguageObjectStringPaths } from 'next-intl';
import { Button } from '@/core/components/common/button';
import { Input, controlRecipe } from '@/core/components/common/input';
import { DashboardSection } from '@/core/components/dashboards/kit/dashboard-layout';
import { SKELETON_BAR } from '@/core/components/dashboards/kit/recipes';
import type { NewInvoiceState } from '@/core/hooks/invoices/use-new-invoice';
import { cn } from '@/core/lib/helpers';
import type { InvoiceDueTermSource, InvoiceProblem } from '@/core/lib/utils/invoices';
import { FIELD_LABEL } from './new-invoice-recipes';

const PROBLEM_KEYS: Record<InvoiceProblem, DottedLanguageObjectStringPaths> = {
	number: 'invoices.new.problems.NUMBER',
	issueDay: 'invoices.new.problems.ISSUE_DATE',
	dueDay: 'invoices.new.problems.DUE_DATE',
	dueBeforeIssue: 'invoices.new.problems.DUE_BEFORE_ISSUE',
	noLines: 'invoices.new.problems.NO_LINES',
	noCurrency: 'invoices.new.problems.NO_CURRENCY'
};

const DUE_TERM_KEYS: Record<InvoiceDueTermSource, DottedLanguageObjectStringPaths> = {
	client: 'invoices.new.terms.CLIENT',
	organization: 'invoices.new.terms.ORGANIZATION',
	standard: 'invoices.new.terms.STANDARD'
};

const DATE_FIELD = cn(controlRecipe, 'h-9 px-2.5');

const HINT = 'text-xs text-muted-foreground text-pretty';

/** Which term gave the due date; silent once the user picks another day. */
function DueTermHint({ invoice, id }: Readonly<{ invoice: NewInvoiceState; id: string }>) {
	const t = useTranslations();
	if (!invoice.isDueDayOfTerm) {
		return null;
	}
	const { source, days } = invoice.dueTerm;
	return (
		<p id={id} className={HINT}>
			{t(DUE_TERM_KEYS[source], { days })}
		</p>
	);
}

function NumberHint({ invoice }: Readonly<{ invoice: NewInvoiceState }>) {
	const t = useTranslations();
	if (invoice.isNumberLoading) {
		return <span aria-hidden="true" className={cn('h-2.5 w-32', SKELETON_BAR)} />;
	}
	if (invoice.nextNumber === null) {
		return <p className="text-xs text-muted-foreground">{t('invoices.new.details.NUMBER_UNKNOWN')}</p>;
	}
	return (
		<p className="text-xs tabular-nums text-muted-foreground">
			{t('invoices.new.details.NUMBER_HINT', { number: invoice.nextNumber })}
		</p>
	);
}

function CurrencyField({ invoice, id }: Readonly<{ invoice: NewInvoiceState; id: string }>) {
	const t = useTranslations();
	const hasChoice = invoice.currencies.length > 1;
	if (!hasChoice) {
		return (
			<div className="flex items-baseline justify-between gap-3">
				<span className={FIELD_LABEL}>{t('invoices.new.details.CURRENCY')}</span>
				<span className="text-[13px] font-medium text-foreground">{invoice.currency ?? '–'}</span>
			</div>
		);
	}
	return (
		<div className="flex flex-col gap-1.5">
			<label htmlFor={id} className={FIELD_LABEL}>
				{t('invoices.new.details.CURRENCY')}
			</label>
			<select
				id={id}
				value={invoice.currencyKey ?? ''}
				onChange={(event) => invoice.changeCurrency(event.target.value)}
				className={cn(controlRecipe, 'h-9 px-2 text-[13px]')}
			>
				{invoice.currencies.map((total) => (
					<option key={total.key} value={total.key}>
						{total.currency ?? t('invoices.new.NO_CURRENCY')}
					</option>
				))}
			</select>
		</div>
	);
}

export function InvoiceDetails({
	invoice,
	showsProblems,
	onSave
}: Readonly<{ invoice: NewInvoiceState; showsProblems: boolean; onSave: () => void }>) {
	const t = useTranslations();
	const fieldId = useId();
	const numberId = `${fieldId}-number`;
	const issueId = `${fieldId}-issue`;
	const dueId = `${fieldId}-due`;
	const dueTermId = `${fieldId}-due-term`;
	const currencyId = `${fieldId}-currency`;
	const problemsId = `${fieldId}-problems`;
	const hasProblems = invoice.problems.length > 0;
	const listsProblems = showsProblems && hasProblems;
	const isNumberInvalid = showsProblems && invoice.problems.includes('number');
	const isIssueInvalid = showsProblems && invoice.problems.includes('issueDay');
	const isDueMissing = invoice.problems.includes('dueDay');
	const isDueTooEarly = invoice.problems.includes('dueBeforeIssue');
	const isDueInvalid = showsProblems && (isDueMissing || isDueTooEarly);
	let dueDescription: string | undefined;
	if (invoice.isDueDayOfTerm) {
		dueDescription = dueTermId;
	}

	return (
		<DashboardSection title={t('invoices.new.details.TITLE')} bodyClassName="flex flex-col gap-4 px-4 pb-4">
			<div className="flex flex-col gap-1.5">
				<label htmlFor={numberId} className={FIELD_LABEL}>
					{t('invoices.new.details.NUMBER')}
				</label>
				<Input
					id={numberId}
					inputMode="numeric"
					autoComplete="off"
					value={invoice.numberText}
					aria-invalid={isNumberInvalid || undefined}
					onChange={(event) => invoice.setNumberText(event.target.value)}
					className="tabular-nums"
				/>
				<NumberHint invoice={invoice} />
			</div>
			<div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
				<div className="flex min-w-0 flex-col gap-1.5">
					<label htmlFor={issueId} className={FIELD_LABEL}>
						{t('invoices.new.details.ISSUE_DATE')}
					</label>
					<input
						id={issueId}
						type="date"
						value={invoice.issueDay}
						aria-invalid={isIssueInvalid || undefined}
						onChange={(event) => invoice.setIssueDay(event.target.value)}
						className={DATE_FIELD}
					/>
				</div>
				<div className="flex min-w-0 flex-col gap-1.5">
					<label htmlFor={dueId} className={FIELD_LABEL}>
						{t('invoices.new.details.DUE_DATE')}
					</label>
					<input
						id={dueId}
						type="date"
						value={invoice.dueDay}
						min={invoice.issueDay}
						aria-invalid={isDueInvalid || undefined}
						aria-describedby={dueDescription}
						onChange={(event) => invoice.setDueDay(event.target.value)}
						className={DATE_FIELD}
					/>
					<DueTermHint invoice={invoice} id={dueTermId} />
				</div>
			</div>
			<CurrencyField invoice={invoice} id={currencyId} />
			<p className="text-xs text-muted-foreground text-pretty">{t('invoices.new.details.DRAFT_NOTE')}</p>
			<Button
				type="button"
				size="default"
				onClick={onSave}
				disabled={invoice.isSaving}
				aria-describedby={problemsId}
				className="w-full"
			>
				{t('invoices.new.SAVE')}
			</Button>
			<ul id={problemsId} aria-live="polite" className="flex flex-col gap-1 empty:hidden">
				{listsProblems &&
					invoice.problems.map((problem) => (
						<li key={problem} className="text-xs text-destructive-ink">
							{t(PROBLEM_KEYS[problem])}
						</li>
					))}
			</ul>
		</DashboardSection>
	);
}
