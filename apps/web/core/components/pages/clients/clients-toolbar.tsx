'use client';

import { useRef } from 'react';
import { useTranslations, type DottedLanguageObjectStringPaths } from 'next-intl';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger
} from '@/core/components/common/dropdown-menu';
import { ListSearchField } from '@/core/components/common/list-search-field';
import { SegmentedControl, type SegmentedControlItem } from '@/core/components/common/segmented-control';
import { SelectedMark } from '@/core/components/common/selected-mark';
import { SegmentCountSkeleton } from '@/core/components/common/skeleton/segmented-control-skeleton';
import { Button } from '@/core/components/duplicated-components/_button';
import { Tooltip } from '@/core/components/duplicated-components/tooltip';
import { GridView, Plus, Sort, Table } from '@/core/components/icons';
import type { ClientsDisplay, ClientsView } from '@/core/hooks/clients/use-clients-display';
import type { ClientsListState } from '@/core/hooks/clients/use-clients-list-state';
import { useClientsSearchKey } from '@/core/hooks/clients/use-clients-search-key';
import { CLIENT_ORDERS, type ClientOrder, type ClientScope } from '@/core/lib/utils/clients';
import { ClientsCountSkeleton } from './clients-list-states';

export interface ClientScopeCounts {
	active: number;
	archived: number;
}

const ORDER_LABEL_KEYS: Record<ClientOrder, DottedLanguageObjectStringPaths> = {
	name: 'common.NAME',
	newest: 'clients.order.NEWEST',
	projects: 'clients.order.MOST_PROJECTS'
};

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

function ViewSwitch({ display }: Readonly<{ display: ClientsDisplay }>) {
	const t = useTranslations();
	const items: SegmentedControlItem<ClientsView>[] = [
		{ value: 'table', icon: <Table />, ariaLabel: t('common.TABLE') },
		{ value: 'cards', icon: <GridView />, ariaLabel: t('common.CARDS') }
	];
	return (
		<SegmentedControl<ClientsView>
			items={items}
			value={display.view}
			onValueChange={display.setView}
			ariaLabel={t('common.VIEW')}
			renderItem={(item, button) => (
				<Tooltip label={item.ariaLabel ?? ''} placement="bottom">
					{button}
				</Tooltip>
			)}
		/>
	);
}

function SortMenu({ display }: Readonly<{ display: ClientsDisplay }>) {
	const t = useTranslations();
	const orderLabel = t(ORDER_LABEL_KEYS[display.order]);
	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<Button
						variant="outline"
						size="default"
						aria-label={t('clients.order.TRIGGER', { order: orderLabel })}
					/>
				}
			>
				<Sort />
				<span>{orderLabel}</span>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" sideOffset={6} className="w-48">
				{CLIENT_ORDERS.map((order) => {
					const isPicked = order === display.order;
					return (
						<DropdownMenuItem key={order} onClick={() => display.setOrder(order)}>
							<span className="min-w-0 flex-1 truncate">{t(ORDER_LABEL_KEYS[order])}</span>
							{isPicked && <SelectedMark />}
						</DropdownMenuItem>
					);
				})}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

export function ClientsToolbar({
	list,
	counts,
	shownCount,
	isLoading,
	canCreate,
	onCreate,
	display
}: Readonly<{
	list: ClientsListState;
	counts: ClientScopeCounts;
	shownCount: number;
	isLoading: boolean;
	canCreate: boolean;
	onCreate: () => void;
	display?: ClientsDisplay;
}>) {
	const t = useTranslations();
	const searchBoxRef = useRef<HTMLDivElement>(null);
	useClientsSearchKey(searchBoxRef);
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
						<span aria-live="polite" className="text-xs tabular-nums text-muted-foreground">
							{t('clients.COUNT', { count: shownCount })}
						</span>
					)}
				</div>
				<div className="flex items-center gap-2">
					{display && <ViewSwitch display={display} />}
					{canCreate && (
						<Button variant="default" size="default" onClick={onCreate}>
							<Plus />
							<span>{t('clients.NEW_CLIENT')}</span>
						</Button>
					)}
				</div>
			</div>
			<div className="flex flex-wrap items-center gap-2 pb-3">
				<SegmentedControl<ClientScope>
					items={scopeItems}
					value={list.scope}
					onValueChange={list.setScope}
					ariaLabel={t('clients.SCOPE_LABEL')}
				/>
				<div ref={searchBoxRef} className="max-sm:order-last max-sm:basis-full">
					<ListSearchField
						value={list.search}
						onChange={list.setSearch}
						placeholder={t('clients.SEARCH_PLACEHOLDER')}
					/>
				</div>
				{display && (
					<div className="ml-auto">
						<SortMenu display={display} />
					</div>
				)}
			</div>
		</div>
	);
}
