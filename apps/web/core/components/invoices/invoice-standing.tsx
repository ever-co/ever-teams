'use client';

import { memo } from 'react';
import { useTranslations, type DottedLanguageObjectStringPaths } from 'next-intl';
import { cn } from '@/core/lib/helpers';
import { invoiceStandingOf, type InvoiceStanding, type StandingInvoice } from '@/core/lib/utils/invoice-standing';
import { invoiceStatusOf, type InvoiceStatus } from '@/core/lib/utils/invoices';

/** One look per way an invoice can stand: a partly paid invoice is open, but draws its paid share. */
export type StandingLook = 'draft' | 'sent' | 'partlyPaid' | 'overdue' | 'paid' | 'void' | 'unknown';

const LOOK_TEXT: Record<StandingLook, string> = {
	draft: 'text-muted-foreground',
	sent: 'text-info-foreground',
	partlyPaid: 'text-warning-foreground',
	overdue: 'text-destructive-ink',
	paid: 'text-success-foreground',
	void: 'text-muted-foreground/70',
	unknown: 'text-muted-foreground'
};

const LOOK_BADGE: Record<StandingLook, string> = {
	draft: 'bg-foreground/5 text-muted-foreground',
	sent: 'bg-info/10 text-info-foreground',
	partlyPaid: 'bg-warning/10 text-warning-foreground',
	overdue: 'bg-destructive/10 text-destructive-ink',
	paid: 'bg-success/10 text-success-foreground',
	void: 'bg-foreground/5 text-muted-foreground',
	unknown: 'bg-foreground/5 text-muted-foreground'
};

const STATUS_LABEL_KEYS: Record<InvoiceStatus, DottedLanguageObjectStringPaths> = {
	DRAFT: 'invoices.status.DRAFT',
	SENT: 'invoices.status.SENT',
	VIEWED: 'invoices.status.VIEWED',
	FULLY_PAID: 'invoices.status.FULLY_PAID',
	PARTIALLY_PAID: 'invoices.status.PARTIALLY_PAID',
	OVERPAID: 'invoices.status.OVERPAID',
	VOID: 'invoices.status.VOID'
};

export interface StandingFacts {
	standing: InvoiceStanding | null;
	status: InvoiceStatus | null;
	look: StandingLook;
	/** The share of the total already paid, 0 to 1, when the API states both figures. */
	paidShare: number | null;
}

type LookedInvoice = Pick<StandingInvoice, 'status' | 'dueDate' | 'totalValue' | 'alreadyPaid'>;

function paidShareOf(invoice: LookedInvoice): number | null {
	const total = invoice.totalValue;
	const paid = invoice.alreadyPaid;
	const hasFigures = typeof total === 'number' && typeof paid === 'number';
	if (!hasFigures) {
		return null;
	}
	if (total <= 0) {
		return null;
	}
	const share = paid / total;
	return Math.min(Math.max(share, 0), 1);
}

function lookOf(standing: InvoiceStanding | null, status: InvoiceStatus | null): StandingLook {
	if (!standing) {
		return 'unknown';
	}
	if (standing === 'open' && status === 'PARTIALLY_PAID') {
		return 'partlyPaid';
	}
	if (standing === 'open') {
		return 'sent';
	}
	return standing;
}

export function standingFactsOf(
	invoice: LookedInvoice,
	todayKey: string,
	timeZone: string | null | undefined
): StandingFacts {
	const standing = invoiceStandingOf(invoice, todayKey, timeZone);
	const status = invoiceStatusOf(invoice.status);
	const look = lookOf(standing, status);
	const paidShare = paidShareOf(invoice);
	return { standing, status, look, paidShare };
}

function Ring({ dashed = false }: Readonly<{ dashed?: boolean }>) {
	let dashArray: string | undefined;
	if (dashed) {
		dashArray = '1.5 1.51';
	}
	return <circle cx="7" cy="7" r="5.75" stroke="currentColor" strokeWidth="1.5" strokeDasharray={dashArray} />;
}

/** A pie filled clockwise from the top by the paid share, inside the ring. */
function PaidPie({ share }: Readonly<{ share: number }>) {
	const angle = share * 2 * Math.PI;
	const endX = 7 + 3 * Math.sin(angle);
	const endY = 7 - 3 * Math.cos(angle);
	let largeArcFlag = 0;
	if (share > 0.5) {
		largeArcFlag = 1;
	}
	if (share >= 1) {
		return <circle cx="7" cy="7" r="3" fill="currentColor" />;
	}
	return <path d={`M7 7V4A3 3 0 ${largeArcFlag} 1 ${endX} ${endY}Z`} fill="currentColor" />;
}

function GlyphShape({ look, paidShare }: Readonly<{ look: StandingLook; paidShare: number | null }>) {
	if (look === 'draft' || look === 'unknown') {
		return <Ring dashed />;
	}
	if (look === 'sent') {
		return <Ring />;
	}
	if (look === 'partlyPaid') {
		return (
			<>
				<Ring />
				<PaidPie share={paidShare ?? 0.5} />
			</>
		);
	}
	if (look === 'overdue') {
		return (
			<>
				<Ring />
				<path d="M7 4.25v3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
				<circle cx="7" cy="9.85" r="0.85" fill="currentColor" />
			</>
		);
	}
	if (look === 'paid') {
		return (
			<>
				<circle cx="7" cy="7" r="6.5" fill="currentColor" />
				<path
					d="M4.6 7.1 6.3 8.8 9.5 5.4"
					stroke="hsl(var(--card))"
					strokeWidth="1.5"
					strokeLinecap="round"
					strokeLinejoin="round"
				/>
			</>
		);
	}
	return (
		<>
			<Ring />
			<path d="M3.2 10.8 10.8 3.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
		</>
	);
}

/**
 * The invoice's standing as a 14px glyph of the status family (dashed for a draft, an empty ring while owed, a pie
 * filled by the paid share, a check once paid, a slash once void), in its tone.
 */
export function InvoiceStandingGlyph({
	look,
	paidShare,
	className
}: Readonly<{ look: StandingLook; paidShare: number | null; className?: string }>) {
	return (
		<svg
			viewBox="0 0 14 14"
			fill="none"
			aria-hidden="true"
			className={cn('size-3.5 shrink-0', LOOK_TEXT[look], className)}
		>
			<GlyphShape look={look} paidShare={paidShare} />
		</svg>
	);
}

function useStandingLabel(facts: StandingFacts, rawStatus: string | null | undefined) {
	const t = useTranslations();
	if (facts.look === 'overdue') {
		return t('invoices.standing.OVERDUE');
	}
	if (facts.status) {
		return t(STATUS_LABEL_KEYS[facts.status]);
	}
	return rawStatus?.trim() || t('invoices.standing.UNKNOWN');
}

interface InvoiceStandingLabelProps {
	invoice: LookedInvoice;
	todayKey: string;
	timeZone: string | null | undefined;
	/** `inline`: glyph and word in rows and tables; `badge`: a soft chip for headers. */
	variant?: 'inline' | 'badge';
	className?: string;
}

/** Where an invoice stands, as a glyph and a word: Draft, Sent, Partially paid, Overdue, Paid, Void. */
export const InvoiceStandingLabel = memo(function InvoiceStandingLabel({
	invoice,
	todayKey,
	timeZone,
	variant = 'inline',
	className
}: InvoiceStandingLabelProps) {
	const facts = standingFactsOf(invoice, todayKey, timeZone);
	const label = useStandingLabel(facts, invoice.status);
	if (variant === 'badge') {
		return (
			<span
				className={cn(
					'inline-flex h-6 shrink-0 items-center gap-1.5 rounded-md px-2 text-xs font-medium',
					LOOK_BADGE[facts.look],
					className
				)}
			>
				<InvoiceStandingGlyph look={facts.look} paidShare={facts.paidShare} className="text-current" />
				{label}
			</span>
		);
	}
	return (
		<span className={cn('inline-flex min-w-0 items-center gap-1.5 text-[13px] text-foreground/80', className)}>
			<InvoiceStandingGlyph look={facts.look} paidShare={facts.paidShare} />
			<span className="truncate">{label}</span>
		</span>
	);
});
