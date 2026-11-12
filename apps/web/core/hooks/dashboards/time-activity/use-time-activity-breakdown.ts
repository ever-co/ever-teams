'use client';

import { useCallback, useMemo, useState } from 'react';
import {
	type BreakdownGrouping,
	type BreakdownNode,
	type TimeActivityRow,
	breakdownFactsOf,
	breakdownTreeOf,
	openableKeysOf
} from '@/core/lib/utils/dashboards/time-activity';

export function useTimeActivityBreakdown(rows: ReadonlyArray<TimeActivityRow>, grouping: BreakdownGrouping) {
	const facts = useMemo(() => breakdownFactsOf(rows), [rows]);
	return useMemo(() => breakdownTreeOf(facts, grouping), [facts, grouping]);
}

function hasChildren(node: BreakdownNode | undefined): node is BreakdownNode {
	const childCount = node?.children.length ?? 0;
	return childCount > 0;
}

/** Until the reader opens or closes a row, the largest one stays open so the levels read at a glance. */
function defaultOpenKeysOf(nodes: ReadonlyArray<BreakdownNode>): ReadonlySet<string> {
	const keys = new Set<string>();
	const first = nodes[0];
	if (hasChildren(first)) {
		keys.add(first.key);
	}
	return keys;
}

function withToggledKey(keys: ReadonlySet<string>, key: string) {
	const next = new Set(keys);
	const isOpen = next.has(key);
	if (isOpen) {
		next.delete(key);
		return next;
	}
	next.add(key);
	return next;
}

export function useBreakdownOpenState(nodes: ReadonlyArray<BreakdownNode>) {
	const [chosenKeys, setChosenKeys] = useState<ReadonlySet<string> | null>(null);
	const defaultKeys = useMemo(() => defaultOpenKeysOf(nodes), [nodes]);
	const openKeys = chosenKeys ?? defaultKeys;
	const isAnyOpen = nodes.some((node) => openKeys.has(node.key));

	const toggle = useCallback(
		(key: string) => {
			setChosenKeys((current) => {
				const base = current ?? defaultKeys;
				return withToggledKey(base, key);
			});
		},
		[defaultKeys]
	);

	const toggleAll = useCallback(() => {
		if (isAnyOpen) {
			setChosenKeys(new Set());
			return;
		}
		const openable = openableKeysOf(nodes);
		setChosenKeys(new Set(openable));
	}, [isAnyOpen, nodes]);

	return { openKeys, isAnyOpen, toggle, toggleAll };
}
