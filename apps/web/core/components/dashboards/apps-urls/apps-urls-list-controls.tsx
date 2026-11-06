'use client';

import { useCallback, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/core/components/duplicated-components/_button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/core/components/common/tooltip';
import { ChevronDown, ChevronUp, InformationCircle } from '@/core/components/icons';
import { cn } from '@/core/lib/helpers';
import type { GroupSort, GroupSortColumn, SortDirection, UsageGroup } from '@/core/lib/utils/dashboards/apps-urls';

/** Beyond this many groups a long period opens collapsed, so the page stays short and light. */
const LEADING_OPEN_COUNT = 5;

const HEADER_BUTTON =
	'-mx-1 inline-flex min-w-0 items-center gap-1 rounded-sm px-1 py-0.5 outline-none transition-colors hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/25';

type OpenBase = 'leading' | 'all' | 'none';

const DEFAULT_DIRECTIONS: Record<GroupSortColumn, SortDirection> = {
	name: 'asc',
	time: 'desc'
};

const OPPOSITE_DIRECTIONS: Record<SortDirection, SortDirection> = {
	asc: 'desc',
	desc: 'asc'
};

const ARIA_SORTS: Record<SortDirection, 'ascending' | 'descending'> = {
	asc: 'ascending',
	desc: 'descending'
};

/** A header click cycles its column through its natural direction, the opposite one, then no sort. */
export function nextSortOf(current: GroupSort | null, column: GroupSortColumn): GroupSort | null {
	const defaultDirection = DEFAULT_DIRECTIONS[column];
	const isOtherColumn = current?.column !== column;
	if (!current || isOtherColumn) {
		return { column, direction: defaultDirection };
	}
	if (current.direction === defaultDirection) {
		return { column, direction: OPPOSITE_DIRECTIONS[defaultDirection] };
	}
	return null;
}

function directionOf(sort: GroupSort | null, column: GroupSortColumn): SortDirection | null {
	if (sort?.column !== column) {
		return null;
	}
	return sort.direction;
}

function ariaSortOf(direction: SortDirection | null) {
	if (!direction) {
		return 'none';
	}
	return ARIA_SORTS[direction];
}

function isOpenByBase(base: OpenBase, key: string, leadingKeys: ReadonlySet<string>) {
	if (base === 'all') {
		return true;
	}
	if (base === 'none') {
		return false;
	}
	return leadingKeys.has(key);
}

export function SortHeader({
	label,
	column,
	sort,
	onSort,
	className
}: Readonly<{
	label: string;
	column: GroupSortColumn;
	sort: GroupSort | null;
	onSort: (column: GroupSortColumn) => void;
	className?: string;
}>) {
	const direction = directionOf(sort, column);
	const isAscending = direction === 'asc';
	const isDescending = direction === 'desc';
	return (
		<span role="columnheader" aria-sort={ariaSortOf(direction)} className={cn('flex min-w-0', className)}>
			<button type="button" onClick={() => onSort(column)} className={HEADER_BUTTON}>
				<span className="truncate">{label}</span>
				{isAscending && <ChevronUp aria-hidden="true" className="size-3.5 shrink-0" />}
				{isDescending && <ChevronDown aria-hidden="true" className="size-3.5 shrink-0" />}
			</button>
		</span>
	);
}

export function ShareHeader({ className }: Readonly<{ className?: string }>) {
	const t = useTranslations();
	const hint = t('dashboard.appsUrls.SHARE_COLUMN_HINT');
	return (
		<span role="columnheader" className={cn('flex items-center justify-end gap-1', className)}>
			<span>{t('dashboard.appsUrls.COLUMN_SHARE')}</span>
			<Tooltip>
				<TooltipTrigger
					aria-label={hint}
					className="inline-flex size-5 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/25"
				>
					<InformationCircle aria-hidden="true" className="size-3.5" />
				</TooltipTrigger>
				<TooltipContent side="top">{hint}</TooltipContent>
			</Tooltip>
		</span>
	);
}

/**
 * Which groups are open: the first few of the natural order until the reader opens or closes one, or picks
 * Expand all or Collapse all.
 */
export function useGroupDisclosure(naturalGroups: ReadonlyArray<UsageGroup>) {
	const [base, setBase] = useState<OpenBase>('leading');
	const [overrides, setOverrides] = useState<ReadonlyMap<string, boolean>>(() => new Map());
	const leadingKeys = useMemo(() => {
		const leading = naturalGroups.slice(0, LEADING_OPEN_COUNT);
		return new Set(leading.map((group) => group.key));
	}, [naturalGroups]);

	const isOpen = useCallback(
		(key: string) => {
			const override = overrides.get(key);
			if (override !== undefined) {
				return override;
			}
			return isOpenByBase(base, key, leadingKeys);
		},
		[base, leadingKeys, overrides]
	);

	const setOpen = useCallback((key: string, nextOpen: boolean) => {
		setOverrides((previous) => {
			const next = new Map(previous);
			next.set(key, nextOpen);
			return next;
		});
	}, []);

	const setAll = useCallback((nextBase: OpenBase) => {
		setBase(nextBase);
		setOverrides(new Map());
	}, []);

	return { isOpen, setOpen, setAll };
}

export function DisclosureAction({
	isEveryGroupOpen,
	onExpandAll,
	onCollapseAll
}: Readonly<{ isEveryGroupOpen: boolean; onExpandAll: () => void; onCollapseAll: () => void }>) {
	const t = useTranslations();
	if (isEveryGroupOpen) {
		return (
			<Button type="button" variant="ghost" size="sm" onClick={onCollapseAll}>
				{t('dashboard.appsUrls.COLLAPSE_ALL')}
			</Button>
		);
	}
	return (
		<Button type="button" variant="ghost" size="sm" onClick={onExpandAll}>
			{t('dashboard.appsUrls.EXPAND_ALL')}
		</Button>
	);
}
