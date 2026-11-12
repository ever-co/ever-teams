'use client';

import { useCallback, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { ClientScope } from '@/core/lib/utils/clients';
import { ARCHIVED_PARAM, urlWithParams } from '@/core/lib/utils/project-list';

function scopeOf(params: URLSearchParams): ClientScope {
	const isArchived = Boolean(params.get(ARCHIVED_PARAM));
	if (isArchived) {
		return 'archived';
	}
	return 'active';
}

/** The scope stays in the URL, as on the Projects page, so a link opens the archived list. */
export function useClientsListState() {
	const params = useSearchParams();
	const router = useRouter();
	const pathname = usePathname();
	const [search, setSearch] = useState('');

	const scope = scopeOf(params);

	const setScope = useCallback(
		(nextScope: ClientScope) => {
			const next = new URLSearchParams(params.toString());
			next.delete(ARCHIVED_PARAM);
			if (nextScope === 'archived') {
				next.set(ARCHIVED_PARAM, 'true');
			}
			router.replace(urlWithParams(pathname, next), { scroll: false });
		},
		[params, pathname, router]
	);

	return { scope, setScope, search, setSearch };
}

export type ClientsListState = ReturnType<typeof useClientsListState>;
