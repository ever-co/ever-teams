/** @jest-environment jsdom */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { ClientAccess } from '@/core/lib/utils/clients';
import type { TClient } from '@/core/types/schemas';

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string, values?: Record<string, unknown>) => {
		if (!values) {
			return key;
		}
		return `${key} ${JSON.stringify(values)}`;
	},
	useLocale: () => 'en'
}));
jest.mock('@/core/components/icons', () => ({ Invoice: () => null }));
jest.mock('@/core/components/common/entity-tile', () => ({ EntityTile: () => null }));
jest.mock('@/core/components/clients/client-actions-menu', () => ({ ClientActionsMenu: () => null }));
jest.mock('@/core/components/clients/client-links', () => ({ newInvoiceHrefOf: () => undefined }));

import { ABOVE_ROW_LINK } from './clients-table-grid';
import { ClientsCards } from './clients-cards';

const READER: ClientAccess = { canCreate: false, canEdit: false, canArchive: false };

describe('ClientsCards', () => {
	it('lifts the project count above the link that stretches over the card, so a click opens the projects', () => {
		const client = { id: 'client-acme', name: 'Acme' } as TClient;
		render(
			<ClientsCards
				clients={[client]}
				projectCounts={new Map([['client-acme', 3]])}
				projectCountsState="ready"
				access={READER}
				canCreateInvoice={false}
				onEdit={jest.fn()}
				onArchive={jest.fn()}
				onRestore={jest.fn()}
				onOpenClient={jest.fn()}
			/>
		);

		const projectsLink = screen.getByRole('link', { name: 'clients.PROJECT_COUNT {"count":3}' });

		for (const className of ABOVE_ROW_LINK.split(' ')) {
			expect(projectsLink.classList.contains(className)).toBe(true);
		}
	});
});
