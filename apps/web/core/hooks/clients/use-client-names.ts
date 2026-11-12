'use client';

import { useMemo } from 'react';
import { clientNamesOf } from '@/core/lib/utils/clients';
import { useClientsQuery } from './use-clients-query';

/** Every client's name by id, archived ones included: a project keeps showing a client that was archived. */
export function useClientNames() {
	const { clients } = useClientsQuery({ includeArchived: true });
	return useMemo(() => clientNamesOf(clients), [clients]);
}
