'use client';

import { useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { useLocale } from 'next-intl';
import type { WorkspaceLocale } from '@/core/lib/utils/workspace-formats';
import { workspaceDateFormatState, workspaceNumberFormatState } from '@/core/stores/user/user-organizations';

/**
 * The reader's language with the workspace's date and number formats, for `dateFormatOf` and `numberFormatOf`. It
 * keeps its identity until the language or a format changes, so it sits in a dependency list as the language did.
 */
export function useWorkspaceLocale(): WorkspaceLocale {
	const tag = useLocale();
	const dateFormat = useAtomValue(workspaceDateFormatState);
	const numberFormat = useAtomValue(workspaceNumberFormatState);

	return useMemo(() => ({ tag, dateFormat, numberFormat }), [tag, dateFormat, numberFormat]);
}
