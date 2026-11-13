'use client';

import { useCallback, useMemo } from 'react';
import { useLocalStorageState } from '@/core/hooks/common/use-local-storage-state';
import type { SheetRowIdentity } from '@/core/lib/utils/dashboards/timesheets';

const STORAGE_KEY = 'timesheets-sheet-draft-rows';

const KEPT_SHEET_COUNT = 30;

const NO_ROWS: SheetRowIdentity[] = [];

type DraftRowsBySheet = Record<string, SheetRowIdentity[]>;

const NO_DRAFTS: DraftRowsBySheet = {};

function prunedOf(drafts: DraftRowsBySheet): DraftRowsBySheet {
	const entries = Object.entries(drafts);
	const overflow = entries.length - KEPT_SHEET_COUNT;
	if (overflow <= 0) {
		return drafts;
	}
	const kept = entries.slice(overflow);
	return Object.fromEntries(kept);
}

function withSheetRows(drafts: DraftRowsBySheet, sheetKey: string, rows: SheetRowIdentity[]): DraftRowsBySheet {
	const others = { ...drafts };
	delete others[sheetKey];
	if (rows.length === 0) {
		return others;
	}
	const next = { ...others, [sheetKey]: rows };
	return prunedOf(next);
}

/**
 * Rows added to one member's sheet of one period that have no time yet: they live on this device until time is typed
 * in them (from then on the logs carry them) or they are removed. `sheetKey` is null while no member is shown.
 */
export function useSheetDraftRows(sheetKey: string | null) {
	const [drafts, setDrafts] = useLocalStorageState<DraftRowsBySheet>(STORAGE_KEY, NO_DRAFTS);

	const rows = useMemo(() => {
		if (!sheetKey) {
			return NO_ROWS;
		}
		return drafts[sheetKey] ?? NO_ROWS;
	}, [drafts, sheetKey]);

	const addRows = useCallback(
		(identities: ReadonlyArray<SheetRowIdentity>) => {
			if (!sheetKey) {
				return;
			}
			setDrafts((current) => {
				const existing = current[sheetKey] ?? NO_ROWS;
				const knownKeys = new Set(existing.map((row) => row.key));
				const added = identities.filter((identity) => !knownKeys.has(identity.key));
				const next = [...existing, ...added];
				return withSheetRows(current, sheetKey, next);
			});
		},
		[setDrafts, sheetKey]
	);

	const removeRow = useCallback(
		(rowKey: string) => {
			if (!sheetKey) {
				return;
			}
			setDrafts((current) => {
				const existing = current[sheetKey] ?? NO_ROWS;
				const next = existing.filter((row) => row.key !== rowKey);
				return withSheetRows(current, sheetKey, next);
			});
		},
		[setDrafts, sheetKey]
	);

	return { rows, addRows, removeRow };
}

export type SheetDraftRows = ReturnType<typeof useSheetDraftRows>;
