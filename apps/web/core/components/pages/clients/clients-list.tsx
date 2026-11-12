'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { EntityTile } from '@/core/components/common/entity-tile';
import { Skeleton } from '@/core/components/common/skeleton';
import { Building, Folder, Mail, Phone } from '@/core/components/icons';
import { ClientActionsMenu } from '@/core/components/clients/client-actions-menu';
import { MUTED_VALUE, formatProjectDay } from '@/core/components/projects/project-cells';
import { cn } from '@/core/lib/helpers';
import type { ClientAccess, ListReadState } from '@/core/lib/utils/clients';
import type { TClient } from '@/core/types/schemas';

const ROW_GRID =
	'grid grid-cols-[minmax(0,1fr)_auto_2.25rem] items-center lg:grid-cols-[minmax(14rem,1fr)_16rem_11rem_8rem_2.25rem]';

const CELL = 'flex min-w-0 items-center px-2 max-lg:hidden';

const LABEL = 'flex min-w-0 items-center gap-1.5 px-2 [&_svg]:size-3.5';

interface ClientsListProps {
	clients: TClient[];
	projectCounts: ReadonlyMap<string, number>;
	/** Whether the projects behind the counts were read: no number is written before, nor after a failed read. */
	projectCountsState: ListReadState;
	access: ClientAccess;
	onEdit: (client: TClient) => void;
	onArchive: (client: TClient) => void;
	onRestore: (client: TClient) => void;
}

export function ClientsList({ clients, projectCounts, ...rowProps }: Readonly<ClientsListProps>) {
	return (
		<div className="rounded-xl bg-card hairline-ring ring-border shadow-sm shadow-black/6.5">
			<ColumnLabels />
			<ul className="hairline-t hairline-divide-y divide-border border-border">
				{clients.map((client) => (
					<ClientRow
						key={client.id}
						client={client}
						projectCount={projectCounts.get(client.id) ?? 0}
						{...rowProps}
					/>
				))}
			</ul>
		</div>
	);
}

function ColumnLabels() {
	const t = useTranslations();
	return (
		<div className={cn(ROW_GRID, 'h-9 pl-1 text-xs font-medium text-muted-foreground')}>
			<span className={LABEL}>
				<Building />
				<span className="truncate">{t('common.CLIENT')}</span>
			</span>
			<span className={cn(LABEL, 'max-lg:hidden')}>
				<Mail />
				<span className="truncate">{t('common.EMAIL')}</span>
			</span>
			<span className={cn(LABEL, 'max-lg:hidden')}>
				<Phone />
				<span className="truncate">{t('clients.form.PHONE')}</span>
			</span>
			<span className={LABEL}>
				<Folder />
				<span className="truncate">{t('clients.COLUMN_PROJECTS')}</span>
			</span>
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
			href={`/projects?clients=${encodeURIComponent(client.id)}`}
			className="truncate rounded-md px-2 py-1 text-[13px] tabular-nums text-foreground outline-none transition-colors hover:text-primary-ink focus-visible:ring-[3px] focus-visible:ring-ring/25"
		>
			{label}
		</Link>
	);
}

function ContactValue({ value, href }: Readonly<{ value: string | null | undefined; href: string }>) {
	if (!value) {
		return null;
	}
	return (
		<a
			href={href}
			className="truncate rounded-sm text-[13px] text-foreground outline-none transition-colors hover:text-primary-ink focus-visible:ring-[3px] focus-visible:ring-ring/25"
		>
			{value}
		</a>
	);
}

function ClientRow({
	client,
	projectCount,
	projectCountsState,
	access,
	onEdit,
	onArchive,
	onRestore
}: Readonly<Omit<ClientsListProps, 'clients' | 'projectCounts'> & { client: TClient; projectCount: number }>) {
	return (
		<li className={cn(ROW_GRID, 'min-h-13 pl-1 transition-colors hover:bg-foreground/[0.02]')}>
			<span className="flex min-w-0 items-center gap-2.5 px-2 py-2">
				<EntityTile name={client.name} imageUrl={client.imageUrl} className="size-8 text-[11px]" />
				<span className="flex min-w-0 flex-col">
					<span className="truncate text-[13px] font-medium text-foreground">{client.name}</span>
					<ClientSubline client={client} />
				</span>
			</span>
			<span className={CELL}>
				<ContactValue value={client.primaryEmail} href={`mailto:${client.primaryEmail}`} />
			</span>
			<span className={CELL}>
				<ContactValue value={client.primaryPhone} href={`tel:${client.primaryPhone}`} />
			</span>
			<span className="flex min-w-0 items-center">
				<ProjectCountCell client={client} count={projectCount} state={projectCountsState} />
			</span>
			<span className="flex justify-center">
				<ClientActionsMenu
					client={client}
					access={access}
					onEdit={onEdit}
					onArchive={onArchive}
					onRestore={onRestore}
				/>
			</span>
		</li>
	);
}
