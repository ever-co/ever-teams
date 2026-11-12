'use client';

import { useMemo } from 'react';
import { useClientsQuery } from './use-clients-query';

/** Every client's name by id, archived ones included: a project keeps showing a client that was archived. */
export function useClientNames() {
	const { clients } = useClientsQuery({ includeArchived: true });
	return useMemo(() => {
		const names = new Map<string, string>();
		for (const client of clients) {
			names.set(client.id, client.name);
		}
		return names;
	}, [clients]);
}
