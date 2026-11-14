'use client';

import { useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { useLocale } from 'next-intl';
import type { WorkspaceLocale } from '@/core/lib/utils/workspace-formats';
import {
	workspaceClockState,
	workspaceCurrencyPositionState,
	workspaceDateFormatState,
	workspaceNumberFormatState
} from '@/core/stores/user/user-organizations';

/**
 * The reader's language with the workspace's date and number formats, its clock and the side of its currency sign,
 * for `dateFormatOf` and `numberFormatOf`. It keeps its identity until the language or a format changes, so it sits
 * in a dependency list as the language did.
 */
export function useWorkspaceLocale(): WorkspaceLocale {
	const tag = useLocale();
	const dateFormat = useAtomValue(workspaceDateFormatState);
	const numberFormat = useAtomValue(workspaceNumberFormatState);
	const clock = useAtomValue(workspaceClockState);
	const currencyPosition = useAtomValue(workspaceCurrencyPositionState);

	return useMemo(
		() => ({ tag, dateFormat, numberFormat, clock, currencyPosition }),
		[tag, dateFormat, numberFormat, clock, currencyPosition]
	);
}
