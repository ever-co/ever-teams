'use client';

import { useLocalStorageState } from '@/core/hooks/common/use-local-storage-state';
import { isClientOrder, type ClientOrder } from '@/core/lib/utils/clients';

export type ClientsView = 'table' | 'cards';

const VIEW_STORAGE_KEY = 'clients-list-view';

const ORDER_STORAGE_KEY = 'clients-list-order';

/** A value stored by an older version, or edited by hand, falls back to the table. */
function viewOf(stored: unknown): ClientsView {
	if (stored === 'cards') {
		return 'cards';
	}
	return 'table';
}

function orderOf(stored: unknown): ClientOrder {
	if (isClientOrder(stored)) {
		return stored;
	}
	return 'name';
}

/** How the person likes the clients listed, table or cards, and in which order; both stay on this device. */
export function useClientsDisplay() {
	const [storedView, setView] = useLocalStorageState<ClientsView>(VIEW_STORAGE_KEY, 'table');
	const [storedOrder, setOrder] = useLocalStorageState<ClientOrder>(ORDER_STORAGE_KEY, 'name');
	const view = viewOf(storedView);
	const order = orderOf(storedOrder);
	return { view, setView, order, setOrder };
}

export type ClientsDisplay = ReturnType<typeof useClientsDisplay>;
