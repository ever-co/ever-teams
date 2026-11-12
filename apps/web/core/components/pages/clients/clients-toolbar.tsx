'use client';

import { useTranslations } from 'next-intl';
import { ListSearchField } from '@/core/components/common/list-search-field';
import { SegmentedControl } from '@/core/components/common/segmented-control';
import { SegmentCountSkeleton } from '@/core/components/common/skeleton/segmented-control-skeleton';
import { Button } from '@/core/components/duplicated-components/_button';
import { Plus } from '@/core/components/icons';
import type { ClientsListState } from '@/core/hooks/clients/use-clients-list-state';
import type { ClientScope } from '@/core/lib/utils/clients';
import { ClientsCountSkeleton } from './clients-list-states';

export interface ClientScopeCounts {
	active: number;
	archived: number;
}

function scopeItemOf(value: ClientScope, label: string, count: number, isLoading: boolean) {
	if (isLoading) {
		return {
			value,
			label: (
				<>
					{label}
					<SegmentCountSkeleton />
				</>
			)
		};
	}
	return { value, label, count };
}

export function ClientsToolbar({
	list,
	counts,
	shownCount,
	isLoading,
	canCreate,
	onCreate
}: Readonly<{
	list: ClientsListState;
	counts: ClientScopeCounts;
	shownCount: number;
	isLoading: boolean;
	canCreate: boolean;
	onCreate: () => void;
}>) {
	const t = useTranslations();
	const scopeItems = [
		scopeItemOf('active', t('clients.SCOPE_ACTIVE'), counts.active, isLoading),
		scopeItemOf('archived', t('clients.SCOPE_ARCHIVED'), counts.archived, isLoading)
	];

	return (
		<div className="px-4">
			<div className="flex min-h-14 flex-wrap items-center justify-between gap-3 py-2.5">
				<div className="flex min-w-0 items-baseline gap-2">
					<h1 className="truncate text-lg font-semibold text-foreground">{t('clients.TITLE')}</h1>
					{isLoading && <ClientsCountSkeleton />}
					{!isLoading && (
						<span className="text-xs tabular-nums text-muted-foreground">
							{t('clients.COUNT', { count: shownCount })}
						</span>
					)}
				</div>
				<div className="flex flex-wrap items-center gap-2">
					<SegmentedControl<ClientScope>
						items={scopeItems}
						value={list.scope}
						onValueChange={list.setScope}
						ariaLabel={t('clients.SCOPE_LABEL')}
					/>
					{canCreate && (
						<Button variant="default" size="default" onClick={onCreate}>
							<Plus />
							<span>{t('clients.NEW_CLIENT')}</span>
						</Button>
					)}
				</div>
			</div>
			<div className="flex flex-wrap items-center gap-2 pb-3">
				<ListSearchField
					value={list.search}
					onChange={list.setSearch}
					placeholder={t('clients.SEARCH_PLACEHOLDER')}
				/>
			</div>
		</div>
	);
}
