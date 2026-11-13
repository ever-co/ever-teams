import type { ReactNode } from 'react';
import { cn } from '@/core/lib/helpers';

/**
 * The invoice as a document: one sheet on a hairline with a thin brand line along its top, then the head, the
 * parties, the lines, the totals and the note. The detail page, the peek and the composer draw the same sheet; the
 * composer passes editable pieces into the same slots.
 */
export function InvoicePaper({ children, className }: Readonly<{ children: ReactNode; className?: string }>) {
	return (
		<article
			className={cn(
				'relative flex flex-col gap-7 overflow-hidden rounded-xl bg-card px-5 pt-7 pb-6 text-card-foreground hairline-ring ring-border shadow-sm shadow-black/6.5 sm:px-8 sm:pt-9 sm:pb-8',
				className
			)}
		>
			<span aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-primary/80" />
			{children}
		</article>
	);
}

export interface PaperFact {
	key: string;
	label: ReactNode;
	value: ReactNode;
}

/** The sender's name on the left, "Invoice" and its number with the key dates on the right. */
export function PaperHead({
	sender,
	title,
	number,
	facts
}: Readonly<{ sender: ReactNode; title: ReactNode; number: ReactNode; facts: ReadonlyArray<PaperFact> }>) {
	return (
		<header className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
			<div className="min-w-0 text-[15px] font-semibold text-foreground">{sender}</div>
			<div className="flex min-w-0 flex-col gap-3 sm:items-end">
				<div className="flex items-baseline gap-2">
					<span className="text-xl font-semibold text-foreground">{title}</span>
					<span className="text-xl tabular-nums text-muted-foreground">{number}</span>
				</div>
				<dl className="grid grid-cols-[auto_auto] gap-x-4 gap-y-1 text-[13px] sm:text-right">
					{facts.map((fact) => (
						<div key={fact.key} className="contents">
							<dt className="text-muted-foreground">{fact.label}</dt>
							<dd className="tabular-nums text-foreground">{fact.value}</dd>
						</div>
					))}
				</dl>
			</div>
		</header>
	);
}

export interface PaperParty {
	key: string;
	label: ReactNode;
	name: ReactNode;
	lines?: ReadonlyArray<string>;
}

export function PaperParties({ parties }: Readonly<{ parties: ReadonlyArray<PaperParty> }>) {
	return (
		<div className="grid gap-5 sm:grid-cols-2">
			{parties.map((party) => (
				<div key={party.key} className="flex min-w-0 flex-col gap-1">
					<span className="text-xs text-muted-foreground">{party.label}</span>
					<span className="truncate text-sm font-medium text-foreground">{party.name}</span>
					{party.lines?.map((line) => (
						<span key={line} className="truncate text-[13px] text-muted-foreground">
							{line}
						</span>
					))}
				</div>
			))}
		</div>
	);
}

/** Description, hours, rate and amount: the head, the group bands and every line share these columns. */
export const PAPER_LINE_GRID =
	'grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1 sm:grid-cols-[minmax(0,1fr)_4.5rem_7rem_7.5rem] sm:items-baseline';

const FIGURE_CELL = 'text-right text-[13px] tabular-nums';

export interface PaperColumnLabels {
	description: ReactNode;
	hours: ReactNode;
	rate: ReactNode;
	amount: ReactNode;
}

/** The lines as a table of figures: one solid hairline under the head and between rows, as every table here. */
export function PaperLines({ labels, children }: Readonly<{ labels: PaperColumnLabels; children: ReactNode }>) {
	return (
		<div role="table" className="flex flex-col">
			<div
				role="row"
				className={cn(PAPER_LINE_GRID, 'hairline-b border-border pb-2 text-xs text-muted-foreground')}
			>
				<span role="columnheader">{labels.description}</span>
				<span role="columnheader" className="text-right max-sm:hidden">
					{labels.hours}
				</span>
				<span role="columnheader" className="text-right max-sm:hidden">
					{labels.rate}
				</span>
				<span role="columnheader" className="text-right">
					{labels.amount}
				</span>
			</div>
			<div role="rowgroup" className="flex flex-col hairline-divide-y divide-border">
				{children}
			</div>
		</div>
	);
}

interface PaperLineProps {
	description: ReactNode;
	/** A muted line under the description: where the line comes from, its rate's source. */
	detail?: ReactNode;
	hours: ReactNode;
	rate: ReactNode;
	amount: ReactNode;
	/** A control at the end of the line, as the composer's remove button. */
	trailing?: ReactNode;
}

export function PaperLine({ description, detail, hours, rate, amount, trailing }: Readonly<PaperLineProps>) {
	return (
		<div role="row" className={cn(PAPER_LINE_GRID, 'group/line relative py-2.5')}>
			<div role="cell" className="flex min-w-0 flex-col gap-0.5">
				<div className="min-w-0 text-[13px] text-foreground">{description}</div>
				{detail && <div className="text-xs text-muted-foreground">{detail}</div>}
				<div className="text-xs tabular-nums text-muted-foreground sm:hidden">
					{hours} · {rate}
				</div>
			</div>
			<span role="cell" className={cn(FIGURE_CELL, 'text-foreground max-sm:hidden')}>
				{hours}
			</span>
			<span role="cell" className={cn(FIGURE_CELL, 'text-muted-foreground max-sm:hidden')}>
				{rate}
			</span>
			<span
				role="cell"
				className={cn(FIGURE_CELL, 'flex items-center justify-end gap-1 font-medium text-foreground')}
			>
				{amount}
				{trailing}
			</span>
		</div>
	);
}

/** A band opening a group of lines (a project, by member): its name, its hours and amount at the end. */
export function PaperGroup({ label, meta }: Readonly<{ label: ReactNode; meta?: ReactNode }>) {
	return (
		<div role="row" className="flex items-center justify-between gap-3 py-2">
			<span role="cell" className="flex min-w-0 items-center gap-2 text-[13px] font-medium text-foreground">
				{label}
			</span>
			{meta && (
				<span role="cell" className="shrink-0 text-xs tabular-nums text-muted-foreground">
					{meta}
				</span>
			)}
		</div>
	);
}

export interface PaperTotalRow {
	key: string;
	label: ReactNode;
	value: ReactNode;
	/** The amount due: the strongest row, over a solid hairline. */
	isTotal?: boolean;
}

/** Subtotal, discount, tax and total, right-aligned under the amounts. */
export function PaperTotals({ rows }: Readonly<{ rows: ReadonlyArray<PaperTotalRow> }>) {
	return (
		<dl className="ml-auto flex w-full max-w-xs flex-col gap-1.5 text-[13px]">
			{rows.map((row) => (
				<div
					key={row.key}
					className={cn(
						'flex items-baseline justify-between gap-4',
						row.isTotal && 'mt-1 hairline-t border-border pt-2.5 text-[15px] font-semibold'
					)}
				>
					<dt className={cn(!row.isTotal && 'text-muted-foreground')}>{row.label}</dt>
					<dd className="tabular-nums text-foreground">{row.value}</dd>
				</div>
			))}
		</dl>
	);
}

export function PaperNote({ label, children }: Readonly<{ label: ReactNode; children: ReactNode }>) {
	return (
		<div className="flex flex-col gap-1">
			<span className="text-xs text-muted-foreground">{label}</span>
			<div className="whitespace-pre-line text-[13px] leading-relaxed text-foreground">{children}</div>
		</div>
	);
}
