'use client';

import { memo, type MouseEvent } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { EntityTile } from '@/core/components/common/entity-tile';
import { Skeleton } from '@/core/components/common/skeleton';
import { EMPTY_VALUE_RECIPE } from '@/core/components/common/surface-recipes';
import { Building, Calendar, Folder, Mail, Plus } from '@/core/components/icons';
import { ClientActionsMenu } from '@/core/components/clients/client-actions-menu';
import type { ClientFormField } from '@/core/components/clients/client-form-dialog';
import { clientSinceTextOf } from '@/core/components/clients/client-format';
import { handleClientClick } from '@/core/components/clients/client-row-click';
import { MUTED_VALUE, formatProjectDay } from '@/core/components/projects/project-cells';
import { cn } from '@/core/lib/helpers';
import {
	clientCreatedDateOf,
	clientPagePathOf,
	clientProjectsPathOf,
	isArchivedClient,
	type ClientAccess,
	type ListReadState
} from '@/core/lib/utils/clients';
import type { TClient } from '@/core/types/schemas';
import { CELL, CLIENTS_TABLE_GRID, CLIENTS_TABLE_SURFACE, WIDE_CELL } from './clients-table-grid';

const LABEL = 'flex min-w-0 items-center gap-1.5 px-2 [&_svg]:size-3.5 [&_svg]:shrink-0';

const QUIET_LINK =
	'truncate rounded-sm outline-none transition-colors hover:text-primary-ink focus-visible:ring-[3px] focus-visible:ring-ring/25';

interface ClientsListProps {
	clients: TClient[];
	projectCounts: ReadonlyMap<string, number>;
	/** Whether the projects behind the counts were read: no number is written before, nor after a failed read. */
	projectCountsState: ListReadState;
	access: ClientAccess;
	onEdit: (client: TClient, field?: ClientFormField) => void;
	onArchive: (client: TClient) => void;
	onRestore: (client: TClient) => void;
	/** Read once by the page for every row; a row's menu reads the invoice permissions itself when it is left out. */
	canCreateInvoice?: boolean;
	/** A plain click on a row opens the client over the list; the name keeps the client's page. */
	onOpenClient?: (client: TClient) => void;
}

type RowProps = Omit<ClientsListProps, 'clients' | 'projectCounts'> & { client: TClient; projectCount: number };

export function ClientsList({ clients, projectCounts, ...rowProps }: Readonly<ClientsListProps>) {
	return (
		<div className={CLIENTS_TABLE_SURFACE}>
			<ColumnLabels />
			<ul className="hairline-divide-y divide-border">
				{clients.map((client) => (
					<ClientRow
						key={client.id}
						client={client}
						projectCount={projectCounts.get(client.id) ?? 0}
						{...rowProps}
					/>
				))}
			</ul>
			<TableFoot clients={clients} projectCounts={projectCounts} state={rowProps.projectCountsState} />
		</div>
	);
}

function ColumnLabels() {
	const t = useTranslations();
	return (
		<div
			className={cn(
				CLIENTS_TABLE_GRID,
				'sticky top-0 z-[1] h-9 rounded-t-xl bg-card pl-1 text-xs font-medium text-muted-foreground hairline-b border-border'
			)}
		>
			<span className={LABEL}>
				<Building />
				<span className="truncate">{t('common.CLIENT')}</span>
			</span>
			<span className={cn(LABEL, 'max-lg:hidden')}>
				<Mail />
				<span className="truncate">{t('common.CONTACT')}</span>
			</span>
			<span className={LABEL}>
				<Folder />
				<span className="truncate">{t('clients.COLUMN_PROJECTS')}</span>
			</span>
			<span className={cn(LABEL, 'max-lg:hidden')}>
				<Calendar />
				<span className="truncate">{t('clients.COLUMN_SINCE')}</span>
			</span>
			<span />
		</div>
	);
}

function projectTotalOf(clients: TClient[], projectCounts: ReadonlyMap<string, number>) {
	let total = 0;
	for (const client of clients) {
		total += projectCounts.get(client.id) ?? 0;
	}
	return total;
}

function TableFoot({
	clients,
	projectCounts,
	state
}: Readonly<{ clients: TClient[]; projectCounts: ReadonlyMap<string, number>; state: ListReadState }>) {
	const t = useTranslations();
	const projectTotal = projectTotalOf(clients, projectCounts);
	const isRead = state === 'ready';
	const showsProjectTotal = isRead && projectTotal > 0;
	return (
		<div
			className={cn(
				CLIENTS_TABLE_GRID,
				'min-h-10 pl-1 text-xs tabular-nums text-muted-foreground hairline-t border-border'
			)}
		>
			<span className={CELL}>{t('clients.COUNT', { count: clients.length })}</span>
			<span className={WIDE_CELL} />
			<span className={CELL}>{showsProjectTotal && t('clients.FOOT_PROJECTS', { count: projectTotal })}</span>
			<span className={WIDE_CELL} />
			<span />
		</div>
	);
}

function ClientSubline({ client }: Readonly<{ client: TClient }>) {
	const t = useTranslations();
	const locale = useLocale();
	const archivedAt = client.deletedAt;
	if (archivedAt) {
		const archivedOn = formatProjectDay(new Date(archivedAt), locale);
		return (
			<span className="truncate text-xs text-muted-foreground">
				{t('clients.ARCHIVED_ON', { date: archivedOn })}
			</span>
		);
	}
	if (!client.primaryEmail) {
		return null;
	}
	return <span className="truncate text-xs text-muted-foreground lg:hidden">{client.primaryEmail}</span>;
}

function ProjectCountCell({
	client,
	count,
	state
}: Readonly<{ client: TClient; count: number; state: ListReadState }>) {
	const t = useTranslations();
	if (state === 'loading') {
		return <Skeleton aria-hidden="true" className="mx-2 h-3 w-14 rounded-full bg-foreground/[0.06]" />;
	}
	if (state === 'failed') {
		return <span className={cn(MUTED_VALUE, 'px-2')}>-</span>;
	}
	const label = t('clients.PROJECT_COUNT', { count });
	const hasProjects = count > 0;
	if (!hasProjects) {
		return <span className={cn(MUTED_VALUE, 'px-2 tabular-nums')}>{label}</span>;
	}
	return (
		<Link
			href={clientProjectsPathOf(client.id)}
			className="truncate rounded-md px-2 py-1 text-[13px] tabular-nums text-foreground outline-none transition-colors hover:text-primary-ink focus-visible:ring-[3px] focus-visible:ring-ring/25"
		>
			{label}
		</Link>
	);
}

function ContactCell({
	client,
	canEdit,
	onEdit
}: Readonly<{ client: TClient; canEdit: boolean; onEdit: (client: TClient, field?: ClientFormField) => void }>) {
	const t = useTranslations();
	const email = client.primaryEmail;
	const phone = client.primaryPhone;
	const hasContact = Boolean(email) || Boolean(phone);
	const mayAdd = canEdit && !isArchivedClient(client);
	if (!hasContact && mayAdd) {
		return (
			<button
				type="button"
				onClick={() => onEdit(client, 'primaryEmail')}
				aria-label={t('clients.contact.ADD_FOR', { name: client.name })}
				className={EMPTY_VALUE_RECIPE}
			>
				<Plus />
				{t('clients.contact.ADD')}
			</button>
		);
	}
	if (!hasContact) {
		return null;
	}
	return (
		<span className="flex min-w-0 flex-col">
			{email && (
				<a href={`mailto:${email}`} className={cn(QUIET_LINK, 'text-[13px] text-foreground')}>
					{email}
				</a>
			)}
			{phone && (
				<a href={`tel:${phone}`} className={cn(QUIET_LINK, 'text-xs tabular-nums text-muted-foreground')}>
					{phone}
				</a>
			)}
		</span>
	);
}

function ClientSinceCell({ client }: Readonly<{ client: TClient }>) {
	const locale = useLocale();
	const createdDate = clientCreatedDateOf(client);
	if (!createdDate) {
		return null;
	}
	return (
		<span className="truncate text-[13px] tabular-nums text-muted-foreground">
			{clientSinceTextOf(createdDate, locale)}
		</span>
	);
}

const ClientRow = memo(function ClientRow({
	client,
	projectCount,
	projectCountsState,
	access,
	canCreateInvoice,
	onEdit,
	onArchive,
	onRestore,
	onOpenClient
}: RowProps) {
	const pagePath = clientPagePathOf(client.id);
	const opensOverList = Boolean(onOpenClient);
	let openOverList: (() => void) | undefined;
	if (onOpenClient) {
		openOverList = () => onOpenClient(client);
	}
	const handleClick = (event: MouseEvent<HTMLLIElement>) => {
		handleClientClick(event, pagePath, openOverList);
	};

	return (
		<li
			onClick={handleClick}
			onAuxClick={handleClick}
			className={cn(
				CLIENTS_TABLE_GRID,
				'min-h-12 pl-1 transition-colors [content-visibility:auto] [contain-intrinsic-size:auto_48px] hover:bg-foreground/[0.03]',
				opensOverList && 'cursor-pointer'
			)}
		>
			<span className="flex min-w-0 items-center gap-2.5 px-2 py-1.5">
				<EntityTile
					name={client.name}
					imageUrl={client.imageUrl}
					className="size-7 rounded-[8px] text-[10px]"
				/>
				<span className="flex min-w-0 flex-col">
					<Link
						href={pagePath}
						className={cn(QUIET_LINK, 'w-fit max-w-full text-[13px] font-medium text-foreground')}
					>
						{client.name}
					</Link>
					<ClientSubline client={client} />
				</span>
			</span>
			<span className={WIDE_CELL}>
				<ContactCell client={client} canEdit={access.canEdit} onEdit={onEdit} />
			</span>
			<span className="flex min-w-0 items-center">
				<ProjectCountCell client={client} count={projectCount} state={projectCountsState} />
			</span>
			<span className={WIDE_CELL}>
				<ClientSinceCell client={client} />
			</span>
			<span className="flex justify-center">
				<ClientActionsMenu
					client={client}
					access={access}
					canCreateInvoice={canCreateInvoice}
					onEdit={onEdit}
					onArchive={onArchive}
					onRestore={onRestore}
				/>
			</span>
		</li>
	);
});
