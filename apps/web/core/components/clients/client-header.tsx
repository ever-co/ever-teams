'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { EntityTile } from '@/core/components/common/entity-tile';
import { Button } from '@/core/components/duplicated-components/_button';
import { Archive, Invoice, Pencil } from '@/core/components/icons';
import { newInvoicePathOf } from '@/core/components/pages/invoices/invoice-access-guard';
import type { ClientTermsReading } from '@/core/hooks/clients/use-client-terms';
import { cn } from '@/core/lib/helpers';
import { clientCreatedDateOf, isArchivedClient, type ClientAccess } from '@/core/lib/utils/clients';
import type { TClient } from '@/core/types/schemas';
import { ClientActionsMenu } from './client-actions-menu';
import { clientSinceTextOf } from './client-format';
import { ownTermsTextOf } from './client-terms-text';

export type ClientHeaderSize = 'page' | 'sheet';

const NAME_SIZE: Record<ClientHeaderSize, string> = {
	page: 'text-2xl',
	sheet: 'text-lg'
};

const LAYOUT: Record<ClientHeaderSize, string> = {
	page: 'flex flex-wrap items-center justify-between gap-x-6 gap-y-3',
	sheet: 'flex flex-col gap-3'
};

const HEADER_MENU_ROWS = ['copyLink', 'archive'] as const;

interface ClientHeaderProps {
	client: TClient;
	size: ClientHeaderSize;
	/** The client's projects listed for the active team; null until they are read. */
	projectCount: number | null;
	terms: ClientTermsReading;
	access: ClientAccess;
	canCreateInvoice: boolean;
	onEdit: (client: TClient) => void;
	onArchive: (client: TClient) => void;
	onRestore: (client: TClient) => void;
	pager?: ReactNode;
}

function ArchivedChip() {
	const t = useTranslations();
	return (
		<span className="inline-flex h-6 shrink-0 items-center gap-1 rounded-md bg-foreground/5 px-2 text-xs font-medium text-muted-foreground [&_svg]:size-3.5">
			<Archive aria-hidden="true" />
			{t('clients.SCOPE_ARCHIVED')}
		</span>
	);
}

function useFactsLine(client: TClient, projectCount: number | null, terms: ClientTermsReading) {
	const t = useTranslations();
	const locale = useLocale();
	const facts: string[] = [];
	const createdDate = clientCreatedDateOf(client);
	if (createdDate) {
		const since = clientSinceTextOf(createdDate, locale);
		facts.push(t('clients.facts.SINCE', { date: since }));
	}
	if (projectCount !== null) {
		facts.push(t('clients.PROJECT_COUNT', { count: projectCount }));
	}
	const ownTerms = ownTermsTextOf(terms, t);
	if (ownTerms) {
		facts.push(ownTerms);
	}
	return facts.join(' · ');
}

export function ClientHeader({
	client,
	size,
	projectCount,
	terms,
	access,
	canCreateInvoice,
	onEdit,
	onArchive,
	onRestore,
	pager
}: Readonly<ClientHeaderProps>) {
	const t = useTranslations();
	const factsLine = useFactsLine(client, projectCount, terms);
	const isArchived = isArchivedClient(client);
	const showsEdit = access.canEdit && !isArchived;
	const showsNewInvoice = canCreateInvoice && !isArchived;
	const hasFacts = factsLine.length > 0;

	return (
		<div className={LAYOUT[size]}>
			<div className="flex min-w-0 items-center gap-3">
				<EntityTile name={client.name} imageUrl={client.imageUrl} className="size-10 rounded-[11px] text-sm" />
				<div className="flex min-w-0 flex-col gap-0.5">
					<div className="flex min-w-0 items-center gap-2">
						<h1 className={cn('truncate font-semibold text-foreground', NAME_SIZE[size])}>{client.name}</h1>
						{isArchived && <ArchivedChip />}
					</div>
					{hasFacts && <p className="truncate text-xs tabular-nums text-muted-foreground">{factsLine}</p>}
				</div>
			</div>
			<div className="flex flex-wrap items-center gap-2">
				{pager}
				{showsEdit && (
					<Button variant="outline" size="default" onClick={() => onEdit(client)}>
						<Pencil />
						<span>{t('common.EDIT')}</span>
					</Button>
				)}
				{showsNewInvoice && (
					<Button asChild variant="default" size="default">
						<Link href={newInvoicePathOf(client.id)}>
							<Invoice />
							<span>{t('invoices.NEW_INVOICE')}</span>
						</Link>
					</Button>
				)}
				<ClientActionsMenu
					client={client}
					access={access}
					canCreateInvoice={canCreateInvoice}
					rows={HEADER_MENU_ROWS}
					onEdit={onEdit}
					onArchive={onArchive}
					onRestore={onRestore}
					triggerClassName="size-8"
				/>
			</div>
		</div>
	);
}
