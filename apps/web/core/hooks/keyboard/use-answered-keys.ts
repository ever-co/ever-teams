'use client';

import { useEffect, useMemo } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { answeredKeysAtom } from '@/core/stores/common/shortcuts';

const ID_SEPARATOR = '|';

/** The ids with one entry of each removed: another component that answers the same key keeps its own entry. */
function withoutOneOfEach(current: readonly string[], removed: readonly string[]): string[] {
	const next = [...current];
	for (const id of removed) {
		const at = next.indexOf(id);
		if (at >= 0) {
			next.splice(at, 1);
		}
	}
	return next;
}

/**
 * Says which keys the caller matches itself while its listener is installed (`isListening`), so the shortcuts sheet
 * lists them on this page only. The ids are the registry's command ids (`listDown`, `chatNext`) or own key ids.
 */
export function useAnsweredKeys(ids: readonly string[], isListening: boolean = true): void {
	const setAnsweredKeys = useSetAtom(answeredKeysAtom);
	const idsKey = ids.join(ID_SEPARATOR);

	useEffect(() => {
		const hasKeys = idsKey.length > 0;
		const answers = isListening && hasKeys;
		if (!answers) {
			return;
		}
		const answered = idsKey.split(ID_SEPARATOR);
		setAnsweredKeys((current) => [...current, ...answered]);
		return () => {
			setAnsweredKeys((current) => withoutOneOfEach(current, answered));
		};
	}, [idsKey, isListening, setAnsweredKeys]);
}

/** The keys some component on the page answers right now. */
export function useAnsweredKeySet(): ReadonlySet<string> {
	const answeredKeys = useAtomValue(answeredKeysAtom);
	return useMemo(() => new Set(answeredKeys), [answeredKeys]);
}
