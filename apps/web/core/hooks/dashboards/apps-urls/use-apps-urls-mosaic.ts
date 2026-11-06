'use client';

import { useCallback, useMemo, useState } from 'react';
import { shareRowsOf, type ShareRow } from '@/core/lib/utils/dashboard-figures';
import {
	LEADING_TITLE_COUNT,
	mosaicItemsOf,
	rowsWithTitles,
	usageGroupsOf,
	usageTotalsOf,
	type MosaicItem,
	type TitleTotal,
	type UsageGroup,
	type UsageTotals
} from '@/core/lib/utils/dashboards/apps-urls';
import type { AppsUrlsReportState } from './use-apps-urls-report';

function titleTotalKeyOf(total: TitleTotal) {
	return total.key;
}

function titleTotalSecondsOf(total: TitleTotal) {
	return total.seconds;
}

function pickedItemOf(items: ReadonlyArray<MosaicItem>, pickedKey: string | null) {
	if (!pickedKey) {
		return null;
	}
	return items.find((item) => item.key === pickedKey) ?? null;
}

export interface AppsUrlsMosaicState {
	/** The split of the period: the three longest apps and sites, then everything else. */
	splitRows: ShareRow<TitleTotal>[];
	items: MosaicItem[];
	/** The tile the list is narrowed to; null once its title is gone from the period. */
	pickedItem: MosaicItem | null;
	togglePick: (key: string) => void;
	clearPick: () => void;
	listGroups: UsageGroup[];
	listTotals: UsageTotals;
}

/**
 * The mosaic of the period and the list under it. Picking a tile narrows the list to that app or site (or to the
 * apps and sites of the others tile); picking it again, or clearing the chip, gives the whole period back. The split
 * and the mosaic always show the whole period.
 */
export function useAppsUrlsMosaic(report: AppsUrlsReportState): AppsUrlsMosaicState {
	const { rows, titleTotals, figures, groups, view } = report;
	const [pickedKey, setPickedKey] = useState<string | null>(null);

	const splitRows = useMemo(
		() => shareRowsOf(titleTotals, titleTotalSecondsOf, titleTotalKeyOf, LEADING_TITLE_COUNT),
		[titleTotals]
	);
	const items = useMemo(() => mosaicItemsOf(titleTotals, figures.totalSeconds), [figures.totalSeconds, titleTotals]);
	const pickedItem = useMemo(() => pickedItemOf(items, pickedKey), [items, pickedKey]);

	const listRows = useMemo(() => {
		if (!pickedItem) {
			return rows;
		}
		return rowsWithTitles(rows, pickedItem.titles);
	}, [pickedItem, rows]);

	const listGroups = useMemo(() => {
		if (!pickedItem) {
			return groups;
		}
		return usageGroupsOf(listRows, view);
	}, [groups, listRows, pickedItem, view]);

	const listTotals = useMemo(() => usageTotalsOf(listRows), [listRows]);

	const togglePick = useCallback((key: string) => {
		setPickedKey((current) => {
			if (current === key) {
				return null;
			}
			return key;
		});
	}, []);
	const clearPick = useCallback(() => setPickedKey(null), []);

	return { splitRows, items, pickedItem, togglePick, clearPick, listGroups, listTotals };
}
