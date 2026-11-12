/** @jest-environment jsdom */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { ClientAccess } from '@/core/lib/utils/clients';
import type { TClient } from '@/core/types/schemas';

const mockInvoiceAccess = { canCreate: true };

jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
jest.mock('@/core/hooks/invoices/use-invoice-access', () => ({ useInvoiceAccess: () => mockInvoiceAccess }));
jest.mock('@/core/components/pages/invoices/invoice-access-guard', () => ({
	newInvoicePathOf: (clientId: string) => `/invoices/new?client=${clientId}`
}));
jest.mock('@/core/components/icons', () => ({
	Archive: () => null,
	Invoice: () => null,
	MoreHorizontal: () => null,
	Pencil: () => null,
	RotateLeft: () => null
}));
// The menu renders its rows inline, so they can be read without opening it.
jest.mock('@headlessui/react', () => {
	const Pass = ({ children }: { children?: React.ReactNode }) => <>{children}</>;
	return { Menu: Pass, MenuButton: Pass, MenuItems: Pass, MenuItem: Pass };
});

import { ClientActionsMenu } from './client-actions-menu';

const activeClient = { id: 'client-acme', name: 'Acme' } as TClient;

const archivedClient = { id: 'client-old', name: 'Old', deletedAt: '2026-10-01T00:00:00.000Z' } as TClient;

const EDITOR: ClientAccess = { canCreate: true, canEdit: true, canArchive: true };

const NO_CLIENT_RIGHTS: ClientAccess = { canCreate: false, canEdit: false, canArchive: false };

function renderMenu(client: TClient, access: ClientAccess) {
	return render(
		<ClientActionsMenu
			client={client}
			access={access}
			onEdit={jest.fn()}
			onArchive={jest.fn()}
			onRestore={jest.fn()}
		/>
	);
}

describe('New invoice in a client’s menu', () => {
	beforeEach(() => {
		mockInvoiceAccess.canCreate = true;
	});

	it('opens a new invoice on that client for a role that may create invoices', () => {
		renderMenu(activeClient, EDITOR);

		const link = screen.getByRole('link', { name: 'invoices.NEW_INVOICE' });

		expect(link.getAttribute('href')).toBe('/invoices/new?client=client-acme');
	});

	it('is offered to such a role even when it may not edit the client', () => {
		renderMenu(activeClient, NO_CLIENT_RIGHTS);

		expect(screen.getByRole('link', { name: 'invoices.NEW_INVOICE' })).toBeTruthy();
	});

	it('is not offered on an archived client', () => {
		renderMenu(archivedClient, EDITOR);

		expect(screen.queryByRole('link', { name: 'invoices.NEW_INVOICE' })).toBeNull();
		expect(screen.getByText('common.RESTORE')).toBeTruthy();
	});

	it('is not offered to a role that may not create invoices', () => {
		mockInvoiceAccess.canCreate = false;

		renderMenu(activeClient, EDITOR);

		expect(screen.queryByRole('link', { name: 'invoices.NEW_INVOICE' })).toBeNull();
		expect(screen.getByText('common.EDIT')).toBeTruthy();
	});
});
