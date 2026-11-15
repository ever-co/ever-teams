'use client';

import { useCallback, useMemo, useState } from 'react';
import { clientNeighboursOf } from '@/core/lib/utils/clients';
import type { TClient } from '@/core/types/schemas';

function stepTo(targetId: string | null, show: (clientId: string) => void) {
	if (!targetId) {
		return undefined;
	}
	return () => show(targetId);
}

/**
 * The client opened over the list: previous and next follow the list as it is shown, and the client stays known
 * after it leaves that list (archived from the sheet itself), so the sheet keeps showing it.
 */
export function useClientPeek(listedClients: ReadonlyArray<TClient>, allClients: ReadonlyArray<TClient>) {
	const [openedId, setOpenedId] = useState<string | null>(null);
	const [isOpen, setIsOpen] = useState(false);

	const client = useMemo(
		() => allClients.find((candidate) => candidate.id === openedId) ?? null,
		[allClients, openedId]
	);
	const neighbours = useMemo(() => clientNeighboursOf(listedClients, openedId), [listedClients, openedId]);

	const open = useCallback((clientId: string) => {
		setOpenedId(clientId);
		setIsOpen(true);
	}, []);

	const close = useCallback(() => setIsOpen(false), []);

	const showPrevious = useMemo(() => stepTo(neighbours.previousId, setOpenedId), [neighbours.previousId]);
	const showNext = useMemo(() => stepTo(neighbours.nextId, setOpenedId), [neighbours.nextId]);

	return { client, isOpen, neighbours, open, close, showPrevious, showNext };
}
