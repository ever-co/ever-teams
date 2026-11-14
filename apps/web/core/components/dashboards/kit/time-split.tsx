'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { SegmentedControl, type SegmentedControlItem } from '@/core/components/common/segmented-control';
import { ProjectMark } from '@/core/components/dashboards/team/team-marks';
import type { TimeSplitState } from '@/core/hooks/dashboards/use-time-split';
import { formatDurationShort } from '@/core/lib/utils/dashboard-figures';
import type { TimeSplitItem, TimeSplitMode } from '@/core/lib/utils/dashboards/time-split';
import { DashboardErrorNotice, RowsSkeleton } from './dashboard-states';
import { ShareBar, ShareRows } from './share-rows';

type Translate = ReturnType<typeof useTranslations>;

const SKELETON_GRID = 'grid grid-cols-[2.75rem_minmax(0,1fr)_5rem] items-center gap-x-3 px-4';

function itemNameOf(item: TimeSplitItem, mode: TimeSplitMode, t: Translate) {
	const isClientMode = mode === 'client';
	if (isClientMode && item.isNone) {
		return t('common.NO_CLIENT');
	}
	if (isClientMode) {
		return item.name || t('common.CLIENT');
	}
	if (item.isNone) {
		return t('dashboard.team.projects.NONE');
	}
	return item.name || t('dashboard.team.projects.NONE');
}

function otherLabelOf(mode: TimeSplitMode, count: number, t: Translate) {
	if (mode === 'client') {
		return t('dashboard.team.projects.OTHER_CLIENTS', { count });
	}
	return t('dashboard.team.projects.OTHER', { count });
}

function emptyTextOf(mode: TimeSplitMode, t: Translate) {
	if (mode === 'client') {
		return t('dashboard.team.projects.CLIENTS_EMPTY');
	}
	return t('dashboard.team.projects.EMPTY');
}

/** "3 projects" or "2 clients" beside the title, once the split holds time. */
export function timeSplitMetaOf(split: TimeSplitState, t: Translate): string | null {
	const hasRows = split.rows.length > 0;
	if (!hasRows) {
		return null;
	}
	if (split.mode === 'client') {
		return t('clientGrouping.CLIENTS', { count: split.namedCount });
	}
	return t('dashboard.team.projects.COUNT', { count: split.namedCount });
}

/** By project or by client; absent for someone who may not read clients, who gets the split by project. */
export function TimeSplitSwitch({ split }: Readonly<{ split: TimeSplitState }>) {
	const t = useTranslations();
	const items = useMemo<SegmentedControlItem<TimeSplitMode>[]>(
		() => [
			{ value: 'project', label: t('dashboard.team.period.BY_PROJECT') },
			{ value: 'client', label: t('dashboard.team.projects.BY_CLIENT') }
		],
		[t]
	);
	if (!split.canSplitByClient) {
		return null;
	}
	return (
		<SegmentedControl
			items={items}
			value={split.mode}
			onValueChange={split.setMode}
			ariaLabel={t('dashboard.team.projects.SPLIT')}
		/>
	);
}

/**
 * Where the time in view went: one share bar, the ranked projects (or clients) with their share and time, the
 * smallest gathered in one row, then the total. Drawn edge to edge: the frame around it gives no padding.
 */
export function TimeSplitBody({
	split,
	isLoading,
	isError,
	onRetry
}: Readonly<{ split: TimeSplitState; isLoading: boolean; isError: boolean; onRetry: () => void }>) {
	const t = useTranslations();
	const { mode, rows } = split;
	const isWaiting = isLoading || split.isClientLookupPending;
	if (isWaiting) {
		return (
			<div className="pt-1 pb-2">
				<RowsSkeleton rows={4} gridClassName={SKELETON_GRID} cellCount={2} withAvatar={false} />
			</div>
		);
	}
	if (isError) {
		return <DashboardErrorNotice onRetry={onRetry} className="m-3" />;
	}
	if (split.isClientLookupError) {
		return (
			<DashboardErrorNotice
				title={t('dashboard.team.projects.CLIENTS_ERROR')}
				onRetry={split.retryClientLookup}
				className="m-3"
			/>
		);
	}
	const isEmpty = rows.length === 0;
	if (isEmpty) {
		return <p className="px-4 pt-1 pb-6 text-xs text-muted-foreground text-pretty">{emptyTextOf(mode, t)}</p>;
	}
	return (
		<div className="flex flex-col pb-2">
			<ShareBar rows={rows} className="mx-4 mt-1 mb-3 w-auto" />
			<ShareRows
				rows={rows}
				renderName={(item) => (
					<>
						<ProjectMark imageUrl={item.imageUrl} color={item.color} isNoProject={item.isNone} />
						<span className="truncate">{itemNameOf(item, mode, t)}</span>
					</>
				)}
				formatValue={formatDurationShort}
				otherLabel={(count) => otherLabelOf(mode, count, t)}
				className="hairline-t border-border"
			/>
			<div className="mx-4 flex min-h-9 items-center justify-between gap-3 hairline-t border-border text-[13px]">
				<span className="text-muted-foreground">{t('dashboard.team.export.TOTAL')}</span>
				<span className="font-semibold tabular-nums text-foreground">
					{formatDurationShort(split.totalSeconds)}
				</span>
			</div>
		</div>
	);
}
