/** @jest-environment jsdom */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { TOrganizationProject } from '@/core/types/schemas';
import { ProjectClientCell } from './project-cells';

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string) => key,
	useLocale: () => 'en'
}));

type ProjectClientFields = Pick<TOrganizationProject, 'organizationContactId' | 'organizationContact'>;

const NO_CLIENT = 'clients.picker.NO_CLIENT';
const NO_NAMES = new Map<string, string>();

const withAcme: ProjectClientFields = { organizationContactId: 'c1', organizationContact: { id: 'c1', name: 'Acme' } };
// The API leaves an archived client out of the relation and keeps its id on the project
const withArchivedClient: ProjectClientFields = { organizationContactId: 'c2', organizationContact: null };
const withoutClient: ProjectClientFields = { organizationContactId: null, organizationContact: null };

describe('the Client cell of the projects list', () => {
	it('names the client of the project', () => {
		render(<ProjectClientCell project={withAcme} clientNames={NO_NAMES} />);

		expect(screen.getByText('Acme')).toBeTruthy();
	});

	it('names an archived client from the list of clients', () => {
		render(<ProjectClientCell project={withArchivedClient} clientNames={new Map([['c2', 'Zenith']])} />);

		expect(screen.getByText('Zenith')).toBeTruthy();
	});

	it('says "No client" only for a project that has none', () => {
		render(<ProjectClientCell project={withoutClient} clientNames={NO_NAMES} />);

		expect(screen.getByText(NO_CLIENT)).toBeTruthy();
	});

	it('writes a client it cannot name as set, never as "No client"', () => {
		render(<ProjectClientCell project={withArchivedClient} clientNames={NO_NAMES} />);

		expect(screen.queryByText(NO_CLIENT)).toBeNull();
		expect(screen.getByText('common.CLIENT')).toBeTruthy();
	});
});
