'use client';

import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { EMPTY_VALUE_RECIPE } from '@/core/components/common/surface-recipes';
import { Button } from '@/core/components/duplicated-components/_button';
import { DASHBOARD_SURFACE } from '@/core/components/dashboards/kit/recipes';
import { Copy, Mail, Pencil, Phone, Plus } from '@/core/components/icons';
import { formatProjectDay } from '@/core/components/projects/project-cells';
import type { ClientTermsReading } from '@/core/hooks/clients/use-client-terms';
import { cn } from '@/core/lib/helpers';
import { clientArchivedDateOf, clientCreatedDateOf, isArchivedClient } from '@/core/lib/utils/clients';
import type { TClient } from '@/core/types/schemas';
import type { ClientFormField } from './client-form-dialog';
import { clientTermsTextOf } from './client-terms-text';

const LABEL = 'text-xs font-medium text-muted-foreground';

const VALUE_LINK =
	'min-w-0 truncate rounded-sm text-[13px] text-foreground outline-none transition-colors hover:text-primary-ink focus-visible:ring-[3px] focus-visible:ring-ring/25';

const PROPERTY_ROW = 'grid min-h-8 grid-cols-[7.5rem_minmax(0,1fr)] items-center gap-3';

/** Notes longer than these lines fold behind "Read more". */
const NOTES_LINE_CLAMP = 'line-clamp-4';

type EditClient = (client: TClient, field?: ClientFormField) => void;

interface FactsSectionProps {
	label: string;
	/** The pencil of the section, which opens the client's form on it; absent where the viewer may not edit. */
	editLabel?: string;
	onEdit?: () => void;
	children: ReactNode;
}

function FactsSection({ label, editLabel, onEdit, children }: Readonly<FactsSectionProps>) {
	const hasPencil = Boolean(onEdit);
	return (
		<section className="flex flex-col gap-1.5">
			<div className="flex h-7 items-center justify-between gap-2">
				<h3 className={LABEL}>{label}</h3>
				{hasPencil && (
					<Button
						type="button"
						variant="ghost"
						size="icon-sm"
						onClick={onEdit}
						aria-label={editLabel}
						title={editLabel}
						className="-mr-1.5 size-6 text-muted-foreground"
					>
						<Pencil className="size-3.5" />
					</Button>
				)}
			</div>
			{children}
		</section>
	);
}

function CopyableValue({ href, value, icon }: Readonly<{ href: string; value: string; icon: ReactNode }>) {
	const t = useTranslations();
	const copyLabel = t('clients.contact.COPY', { value });
	const copy = async () => {
		try {
			await navigator.clipboard.writeText(value);
			toast.success(t('common.COPIED'));
		} catch {
			toast.error(t('clients.contact.NOT_COPIED'));
		}
	};
	return (
		<div className="flex min-h-8 min-w-0 items-center gap-2.5 [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-muted-foreground">
			{icon}
			<a href={href} className={VALUE_LINK}>
				{value}
			</a>
			<Button
				type="button"
				variant="ghost"
				size="icon-sm"
				onClick={() => void copy()}
				aria-label={copyLabel}
				title={copyLabel}
				className="ml-auto size-6 shrink-0 text-muted-foreground"
			>
				<Copy className="size-3.5" />
			</Button>
		</div>
	);
}

function MissingValue({
	icon,
	addLabel,
	missingLabel,
	onAdd
}: Readonly<{ icon: ReactNode; addLabel: string; missingLabel: string; onAdd?: () => void }>) {
	if (onAdd) {
		return (
			<button type="button" onClick={onAdd} className={cn(EMPTY_VALUE_RECIPE, 'h-8 w-fit')}>
				<Plus />
				{addLabel}
			</button>
		);
	}
	return (
		<div className="flex min-h-8 items-center gap-2.5 text-[13px] text-muted-foreground [&>svg]:size-4 [&>svg]:shrink-0">
			{icon}
			{missingLabel}
		</div>
	);
}

function ClientNotes({ notes }: Readonly<{ notes: string }>) {
	const t = useTranslations();
	const textRef = useRef<HTMLParagraphElement>(null);
	const [isExpanded, setIsExpanded] = useState(false);
	const [isClamped, setIsClamped] = useState(false);

	// Measured with the clamp on only: expanded, the text never runs longer than itself, and the toggle would go
	useLayoutEffect(() => {
		const text = textRef.current;
		if (!text) {
			return;
		}
		if (isExpanded) {
			return;
		}
		const runsLonger = text.scrollHeight > text.clientHeight + 1;
		setIsClamped(runsLonger);
	}, [notes, isExpanded]);

	const showsToggle = isClamped || isExpanded;
	let toggleLabel = t('clients.notes.READ_MORE');
	if (isExpanded) {
		toggleLabel = t('clients.notes.SHOW_LESS');
	}

	return (
		<div className="flex flex-col items-start gap-1">
			<p
				ref={textRef}
				className={cn(
					'text-[13px] leading-relaxed whitespace-pre-line text-foreground',
					!isExpanded && NOTES_LINE_CLAMP
				)}
			>
				{notes}
			</p>
			{showsToggle && (
				<button
					type="button"
					aria-expanded={isExpanded}
					onClick={() => setIsExpanded((expanded) => !expanded)}
					className="rounded-sm text-xs font-medium text-primary-ink outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/25"
				>
					{toggleLabel}
				</button>
			)}
		</div>
	);
}

interface ClientFactsProps {
	client: TClient;
	terms: ClientTermsReading;
	canEdit: boolean;
	onEdit: EditClient;
	/** On the page the facts are a rail of their own surface; inside the sheet they sit on the sheet's. */
	framed: boolean;
}

export function ClientFacts({ client, terms, canEdit, onEdit, framed }: Readonly<ClientFactsProps>) {
	const t = useTranslations();
	const locale = useLocale();
	const isArchived = isArchivedClient(client);
	const mayEdit = canEdit && !isArchived;
	const email = client.primaryEmail;
	const phone = client.primaryPhone;
	const notes = client.notes?.trim();
	const createdDate = clientCreatedDateOf(client);
	const archivedDate = clientArchivedDateOf(client);
	const termsText = clientTermsTextOf(terms, t);
	const hasDetails = Boolean(createdDate) || Boolean(archivedDate);
	let frameClassName = '';
	if (framed) {
		frameClassName = cn(DASHBOARD_SURFACE, 'p-4');
	}

	const editOn = (field: ClientFormField) => {
		if (!mayEdit) {
			return undefined;
		}
		return () => onEdit(client, field);
	};

	return (
		<div className={cn('flex flex-col gap-5', frameClassName)}>
			<FactsSection
				label={t('common.CONTACT')}
				editLabel={t('clients.facts.EDIT_CONTACT')}
				onEdit={editOn('primaryEmail')}
			>
				{email && <CopyableValue href={`mailto:${email}`} value={email} icon={<Mail aria-hidden="true" />} />}
				{!email && (
					<MissingValue
						icon={<Mail aria-hidden="true" />}
						addLabel={t('clients.contact.ADD_EMAIL')}
						missingLabel={t('clients.contact.NO_EMAIL')}
						onAdd={editOn('primaryEmail')}
					/>
				)}
				{phone && <CopyableValue href={`tel:${phone}`} value={phone} icon={<Phone aria-hidden="true" />} />}
				{!phone && (
					<MissingValue
						icon={<Phone aria-hidden="true" />}
						addLabel={t('clients.contact.ADD_PHONE')}
						missingLabel={t('clients.contact.NO_PHONE')}
						onAdd={editOn('primaryPhone')}
					/>
				)}
			</FactsSection>
			<FactsSection
				label={t('clients.form.BILLING')}
				editLabel={t('clients.facts.EDIT_TERMS')}
				onEdit={editOn('paymentTerms')}
			>
				<div className={PROPERTY_ROW}>
					<span className="text-[13px] text-muted-foreground">{t('clients.form.PAYMENT_TERMS')}</span>
					<span className="truncate text-[13px] text-foreground">{termsText}</span>
				</div>
			</FactsSection>
			<FactsSection label={t('common.NOTES')} editLabel={t('clients.facts.EDIT_NOTES')} onEdit={editOn('notes')}>
				{notes && <ClientNotes notes={notes} />}
				{!notes && mayEdit && (
					<button
						type="button"
						onClick={() => onEdit(client, 'notes')}
						className={cn(EMPTY_VALUE_RECIPE, 'h-8 w-fit')}
					>
						<Plus />
						{t('clients.notes.ADD')}
					</button>
				)}
				{!notes && !mayEdit && <p className="text-[13px] text-muted-foreground">{t('clients.notes.NONE')}</p>}
			</FactsSection>
			{hasDetails && (
				<FactsSection label={t('common.DETAILS')}>
					{createdDate && (
						<div className={PROPERTY_ROW}>
							<span className="text-[13px] text-muted-foreground">{t('clients.facts.ADDED')}</span>
							<span className="text-[13px] tabular-nums text-foreground">
								{formatProjectDay(createdDate, locale)}
							</span>
						</div>
					)}
					{archivedDate && (
						<div className={PROPERTY_ROW}>
							<span className="text-[13px] text-muted-foreground">{t('clients.SCOPE_ARCHIVED')}</span>
							<span className="text-[13px] tabular-nums text-foreground">
								{formatProjectDay(archivedDate, locale)}
							</span>
						</div>
					)}
				</FactsSection>
			)}
		</div>
	);
}
