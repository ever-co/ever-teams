'use client';

import { useTranslations } from 'next-intl';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from '@/core/components/common/dropdown-menu';
import { SelectedMark } from '@/core/components/common/selected-mark';
import { Button } from '@/core/components/duplicated-components/_button';
import { ArrowUp, ChevronDown, Sort } from '@/core/components/icons';
import { cn } from '@/core/lib/helpers';
import type { SortDirection, TeamSort, TeamSortKey, TeamTableView } from '@/core/lib/utils/dashboards/team';

type Translate = ReturnType<typeof useTranslations>;

const MEMBER_SORT_KEYS: ReadonlyArray<TeamSortKey> = ['tracked', 'activity', 'count', 'projects', 'name'];

const DAY_SORT_KEYS: ReadonlyArray<TeamSortKey> = ['name', 'tracked', 'activity', 'count', 'projects'];

const DIRECTIONS: ReadonlyArray<SortDirection> = ['desc', 'asc'];

const DIRECTION_LABEL_KEYS = {
	asc: 'dashboard.team.roster.ASCENDING',
	desc: 'dashboard.team.roster.DESCENDING'
} as const;

function sortKeysOf(view: TeamTableView) {
	if (view === 'member') {
		return MEMBER_SORT_KEYS;
	}
	return DAY_SORT_KEYS;
}

function sortLabelOf(key: TeamSortKey, view: TeamTableView, t: Translate) {
	const isMemberView = view === 'member';
	switch (key) {
		case 'name':
			if (isMemberView) {
				return t('dashboard.team.table.MEMBER');
			}
			return t('dashboard.team.table.DAY');
		case 'activity':
			return t('dashboard.team.table.ACTIVITY');
		case 'count':
			if (isMemberView) {
				return t('dashboard.team.table.DAYS');
			}
			return t('dashboard.team.table.MEMBERS');
		case 'projects':
			return t('dashboard.team.table.PROJECTS');
		case 'share':
			return t('dashboard.team.table.SHARE');
		default:
			return t('dashboard.team.table.TRACKED');
	}
}

function DirectionIcon({ direction }: Readonly<{ direction: SortDirection }>) {
	return (
		<ArrowUp
			aria-hidden="true"
			className={cn('size-3.5 text-muted-foreground transition-transform', direction === 'desc' && 'rotate-180')}
		/>
	);
}

/** The hook only toggles: picking the key in use, or the other direction, flips the order. */
export function TeamRosterSort({
	view,
	sort,
	onSort
}: Readonly<{ view: TeamTableView; sort: TeamSort; onSort: (key: TeamSortKey) => void }>) {
	const t = useTranslations();
	const currentLabel = sortLabelOf(sort.key, view, t);
	const pickDirection = (direction: SortDirection) => {
		const isCurrentDirection = direction === sort.direction;
		if (isCurrentDirection) {
			return;
		}
		onSort(sort.key);
	};
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					type="button"
					variant="ghost"
					size="default"
					aria-label={t('dashboard.team.table.SORT_BY', { column: currentLabel })}
				>
					<Sort aria-hidden="true" className="text-muted-foreground" />
					<span>{currentLabel}</span>
					<DirectionIcon direction={sort.direction} />
					<ChevronDown aria-hidden="true" className="size-3.5 text-muted-foreground" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="min-w-48">
				<DropdownMenuGroup>
					<DropdownMenuLabel>{t('common.SORT')}</DropdownMenuLabel>
					{sortKeysOf(view).map((key) => {
						const isCurrent = key === sort.key;
						return (
							<DropdownMenuItem key={key} onClick={() => onSort(key)}>
								<span className="flex-1">{sortLabelOf(key, view, t)}</span>
								{isCurrent && <SelectedMark />}
							</DropdownMenuItem>
						);
					})}
				</DropdownMenuGroup>
				<DropdownMenuSeparator />
				<DropdownMenuGroup>
					{DIRECTIONS.map((direction) => {
						const isCurrent = direction === sort.direction;
						return (
							<DropdownMenuItem key={direction} onClick={() => pickDirection(direction)}>
								<DirectionIcon direction={direction} />
								<span className="flex-1">{t(DIRECTION_LABEL_KEYS[direction])}</span>
								{isCurrent && <SelectedMark />}
							</DropdownMenuItem>
						);
					})}
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
