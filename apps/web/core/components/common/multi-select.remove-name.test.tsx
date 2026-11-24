/** @jest-environment jsdom */
// cspell:ignore Entfernen
import React from 'react';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import english from '@/locales/en.json';
import german from '@/locales/de.json';
// The colour of a chip comes from a module that draws in the whole app: the names under test do not depend on it
jest.mock('@/core/components', () => ({ statusColor: () => undefined }));
jest.mock('@/core/lib/utils', () => ({ clsxm: (...values: string[]) => values.filter(Boolean).join(' ') }));

import { MultiSelect } from './multi-select';

interface Team {
	id: string;
	name: string;
}

const TEAMS: Team[] = [
	{ id: 'design', name: 'Design' },
	{ id: 'support', name: 'Support' }
];

function renderPicked(locale: string, messages: Record<string, unknown>) {
	render(
		<NextIntlClientProvider locale={locale} messages={messages}>
			<MultiSelect
				items={TEAMS}
				value={TEAMS}
				onValueChange={() => undefined}
				itemToString={(team) => team.name}
				itemId={(team) => team.id}
				multiSelect
			/>
		</NextIntlClientProvider>
	);
}

/**
 * The chips of the picked items each carry a small cross. Its name was "Remove item" on every chip and in every
 * language: a screen reader could not tell one cross from the next.
 */
describe('the remove button of a picked item', () => {
	it('names its item, in German on a German page', () => {
		renderPicked('de', german);

		expect(screen.getByRole('button', { name: 'Entfernen: Design' })).toBeTruthy();
		expect(screen.getByRole('button', { name: 'Entfernen: Support' })).toBeTruthy();
		expect(screen.queryByRole('button', { name: 'Remove item' })).toBeNull();
	});

	it('names its item in English', () => {
		renderPicked('en', english);

		expect(screen.getByRole('button', { name: 'Remove: Design' })).toBeTruthy();
	});
});
