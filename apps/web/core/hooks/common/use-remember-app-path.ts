'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSetAtom } from 'jotai';
import { lastAppPathState } from '@/core/stores/common/setting';

export function useRememberAppPath(pathname: string | null, isInSettings: boolean) {
	const setLastAppPath = useSetAtom(lastAppPathState);
	const searchParams = useSearchParams();
	const query = searchParams?.toString() ?? '';

	useEffect(() => {
		if (isInSettings) {
			return;
		}
		if (!pathname) {
			return;
		}
		const hasQuery = query.length > 0;
		if (hasQuery) {
			setLastAppPath(`${pathname}?${query}`);
			return;
		}
		setLastAppPath(pathname);
	}, [pathname, query, isInSettings, setLastAppPath]);
}
