/** @jest-environment jsdom */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { ClientAccess, ListReadState } from '@/core/lib/utils/clients';
import type { TClient } from '@/core/types/schemas';
import { ClientsList } from './clients-list';

// The keys stand for the texts, followed by the values they are given
function translate(key: string, values?: Record<string, unknown>) {
	if (!values) {
		return key;
	}
	return `${key} ${JSON.stringify(values)}`;
}

jest.mock('next-intl', () => ({
	useTranslations: () => translate,
	useLocale: () => 'en'
}));
jest.mock('next/link', () => ({
	__esModule: true,
	default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>
}));
jest.mock('@/core/components/clients/client-actions-menu', () => ({ ClientActionsMenu: () => null }));

const acme: TClient = { id: 'client-acme', name: 'Acme' };
const access: ClientAccess = { canCreate: false, canEdit: false, canArchive: false };
const NO_PROJECTS = 'clients.PROJECT_COUNT {"count":0}';

function renderList(projectCountsState: ListReadState, projectCounts: ReadonlyMap<string, number>) {
	const ignore = jest.fn();
	return render(
		<ClientsList
			clients={[acme]}
			projectCounts={projectCounts}
			projectCountsState={projectCountsState}
			access={access}
			onEdit={ignore}
			onArchive={ignore}
			onRestore={ignore}
		/>
	);
}

describe('the number of projects in a row of the Clients page', () => {
	it('links to the projects of the client once the projects are read', () => {
		renderList('ready', new Map([['client-acme', 2]]));

		const link = screen.getByRole('link', { name: 'clients.PROJECT_COUNT {"count":2}' });
		expect(link.getAttribute('href')).toBe('/projects?clients=client-acme');
	});

	it('says "No projects" only when the projects were read and the client has none', () => {
		renderList('ready', new Map());

		expect(screen.getByText(NO_PROJECTS)).toBeTruthy();
	});

	it('writes no number while the projects are loading', () => {
		renderList('loading', new Map());

		expect(screen.queryByText(/clients\.PROJECT_COUNT/)).toBeNull();
	});

	it('writes no number, and no "No projects", when the projects could not be read', () => {
		renderList('failed', new Map());

		expect(screen.queryByText(/clients\.PROJECT_COUNT/)).toBeNull();
		expect(screen.getByText('-')).toBeTruthy();
	});
});
