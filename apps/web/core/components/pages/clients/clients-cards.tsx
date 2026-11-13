'use client';

import { memo, type MouseEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import stc from 'string-to-color';
import { EntityTile } from '@/core/components/common/entity-tile';
import { Skeleton } from '@/core/components/common/skeleton';
import { Button } from '@/core/components/duplicated-components/_button';
import { Invoice } from '@/core/components/icons';
import { ClientActionsMenu } from '@/core/components/clients/client-actions-menu';
import type { ClientFormField } from '@/core/components/clients/client-form-dialog';
import { clientSinceTextOf } from '@/core/components/clients/client-format';
import { newInvoiceHrefOf } from '@/core/components/clients/client-links';
import { handleClientClick } from '@/core/components/clients/client-row-click';
import {
	clientCreatedDateOf,
	clientPagePathOf,
	clientProjectsPathOf,
	isArchivedClient,
	type ClientAccess,
	type ListReadState
} from '@/core/lib/utils/clients';
import type { TClient } from '@/core/types/schemas';
import { CLIENTS_CARDS_GRID } from './clients-table-grid';

const FACT_LABEL = 'truncate text-xs text-muted-foreground';

const FACT_VALUE = 'truncate text-[13px] tabular-nums text-foreground';

interface ClientsCardsProps {
	clients: TClient[];
	projectCounts: ReadonlyMap<string, number>;
	projectCountsState: ListReadState;
	access: ClientAccess;
	canCreateInvoice: boolean;
	onEdit: (client: TClient, field?: ClientFormField) => void;
	onArchive: (client: TClient) => void;
	onRestore: (client: TClient) => void;
	onOpenClient: (client: TClient) => void;
}

type CardProps = Omit<ClientsCardsProps, 'clients' | 'projectCounts'> & { client: TClient; projectCount: number };

function firstLineOf(notes: string | null | undefined) {
	const trimmed = notes?.trim() ?? '';
	const lines = trimmed.split('\n');
	return lines[0] ?? '';
}

function Fact({ label, children }: Readonly<{ label: string; children: ReactNode }>) {
	return (
		<div className="flex min-w-0 flex-col gap-0.5">
			<dt className={FACT_LABEL}>{label}</dt>
			<dd className={FACT_VALUE}>{children}</dd>
		</div>
	);
}

function ProjectsFact({ client, count, state }: Readonly<{ client: TClient; count: number; state: ListReadState }>) {
	const t = useTranslations();
	if (state === 'loading') {
		return <Skeleton aria-hidden="true" className="mt-1 h-3 w-10 rounded-full bg-foreground/[0.06]" />;
	}
	if (state === 'failed') {
		return <span className="text-muted-foreground">-</span>;
	}
	const hasProjects = count > 0;
	if (!hasProjects) {
		return <span className="text-muted-foreground">{count}</span>;
	}
	return (
		<Link
			href={clientProjectsPathOf(client.id)}
			aria-label={t('clients.PROJECT_COUNT', { count })}
			className="rounded-sm outline-none transition-colors hover:text-primary-ink focus-visible:ring-[3px] focus-visible:ring-ring/25"
		>
			{count}
		</Link>
	);
}

function TermsFact({ client }: Readonly<{ client: TClient }>) {
	const t = useTranslations();
	const days = client.paymentTermsDays;
	if (typeof days !== 'number') {
		return <span className="text-muted-foreground">{t('clients.terms.WORKSPACE_SHORT')}</span>;
	}
	if (days === 0) {
		return <>{t('clients.terms.RECEIPT')}</>;
	}
	return <>{t('clients.terms.DAYS', { days })}</>;
}

const ClientCard = memo(function ClientCard({
	client,
	projectCount,
	projectCountsState,
	access,
	canCreateInvoice,
	onEdit,
	onArchive,
	onRestore,
	onOpenClient
}: CardProps) {
	const t = useTranslations();
	const locale = useLocale();
	const pagePath = clientPagePathOf(client.id);
	const isArchived = isArchivedClient(client);
	const createdDate = clientCreatedDateOf(client);
	const notesLine = firstLineOf(client.notes);
	const hasNotes = notesLine.length > 0;
	const newInvoiceHref = newInvoiceHrefOf(client, canCreateInvoice);
	const markerColor = stc(client.name);
	let standingWord = t('clients.SCOPE_ACTIVE');
	if (isArchived) {
		standingWord = t('clients.SCOPE_ARCHIVED');
	}
	let sinceText = '';
	if (createdDate) {
		sinceText = clientSinceTextOf(createdDate, locale);
	}

	const openOverList = () => onOpenClient(client);
	const handleClick = (event: MouseEvent<HTMLLIElement>) => {
		handleClientClick(event, pagePath, openOverList);
	};

	return (
		<li
			onClick={handleClick}
			onAuxClick={handleClick}
			className="flex cursor-pointer flex-col gap-3 rounded-xl bg-card p-4 hairline-ring ring-border shadow-sm shadow-black/6.5 transition-colors [content-visibility:auto] [contain-intrinsic-size:auto_200px] hover:bg-foreground/[0.015]"
		>
			<div className="flex min-w-0 items-center gap-2.5">
				<EntityTile
					name={client.name}
					imageUrl={client.imageUrl}
					className="size-8 rounded-[9px] text-[11px]"
				/>
				<Link
					href={pagePath}
					className="min-w-0 truncate rounded-sm text-[13px] font-medium text-foreground outline-none transition-colors hover:text-primary-ink focus-visible:ring-[3px] focus-visible:ring-ring/25"
				>
					{client.name}
				</Link>
				<span className="ml-auto shrink-0 text-xs text-muted-foreground">{standingWord}</span>
				<ClientActionsMenu
					client={client}
					access={access}
					canCreateInvoice={canCreateInvoice}
					onEdit={onEdit}
					onArchive={onArchive}
					onRestore={onRestore}
					triggerClassName="-mr-1.5"
				/>
			</div>
			{hasNotes && (
				<p className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
					<span
						aria-hidden="true"
						className="h-3 w-0.5 shrink-0 rounded-full"
						style={{ backgroundColor: markerColor }}
					/>
					<span className="truncate">{notesLine}</span>
				</p>
			)}
			<dl className="grid grid-cols-3 gap-3">
				<Fact label={t('clients.COLUMN_PROJECTS')}>
					<ProjectsFact client={client} count={projectCount} state={projectCountsState} />
				</Fact>
				<Fact label={t('clients.COLUMN_SINCE')}>{sinceText}</Fact>
				<Fact label={t('clients.facts.TERMS')}>
					<TermsFact client={client} />
				</Fact>
			</dl>
			<div className="mt-auto flex items-center gap-2">
				{newInvoiceHref && (
					<Button asChild variant="outline" size="sm">
						<Link href={newInvoiceHref}>
							<Invoice />
							<span>{t('invoices.NEW_INVOICE')}</span>
						</Link>
					</Button>
				)}
				<Button type="button" variant="ghost" size="sm" onClick={openOverList}>
					{t('common.OPEN')}
				</Button>
			</div>
		</li>
	);
});

export function ClientsCards({ clients, projectCounts, ...cardProps }: Readonly<ClientsCardsProps>) {
	return (
		<ul className={CLIENTS_CARDS_GRID}>
			{clients.map((client) => (
				<ClientCard
					key={client.id}
					client={client}
					projectCount={projectCounts.get(client.id) ?? 0}
					{...cardProps}
				/>
			))}
		</ul>
	);
}

const CARD_SKELETON_KEYS = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth'];

export function ClientsCardsSkeleton() {
	return (
		<ul aria-hidden="true" className={CLIENTS_CARDS_GRID}>
			{CARD_SKELETON_KEYS.map((key) => (
				<li
					key={key}
					className="flex h-[11.5rem] flex-col gap-3 rounded-xl bg-card p-4 hairline-ring ring-border shadow-sm shadow-black/6.5"
				>
					<div className="flex items-center gap-2.5">
						<Skeleton className="size-8 rounded-[9px] bg-foreground/[0.06]" />
						<Skeleton className="h-3 w-32 rounded-full bg-foreground/[0.06]" />
					</div>
					<Skeleton className="h-2.5 w-44 rounded-full bg-foreground/[0.06]" />
					<div className="grid grid-cols-3 gap-3">
						<Skeleton className="h-6 rounded-md bg-foreground/[0.05]" />
						<Skeleton className="h-6 rounded-md bg-foreground/[0.05]" />
						<Skeleton className="h-6 rounded-md bg-foreground/[0.05]" />
					</div>
					<div className="mt-auto flex gap-2">
						<Skeleton className="h-7 w-24 rounded-full bg-foreground/[0.05]" />
						<Skeleton className="h-7 w-14 rounded-full bg-foreground/[0.05]" />
					</div>
				</li>
			))}
		</ul>
	);
}
