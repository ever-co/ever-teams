/** @jest-environment jsdom */
n// cspell:ignore Erstellen einen heute

import React from 'react';
import { render, screen } from '@testing-library/react';
import { AppDialog, AppDialogHeader } from './app-dialog';

jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));

const LONG_TITLE = 'Erstellen Sie einen Plan für heute';

function renderHeader() {
	render(
		<AppDialog open onClose={() => undefined}>
			<AppDialogHeader title={LONG_TITLE} context={<span>Harbor Operations</span>} onClose={() => undefined} />
		</AppDialog>
	);
	const title = screen.getByText(LONG_TITLE);
	const header = title.parentElement as HTMLElement;
	const team = screen.getByText('Harbor Operations').parentElement as HTMLElement;
	return { title, header, team };
}

const classesOf = (element: HTMLElement) => element.className.split(/\s+/);

/**
 * The header of the app's dialogs at phone width (#5736): a title too long for its line was cut with an ellipsis, and
 * in German the no-plan sheet lost "heute", the word that says what the sheet asks.
 */
describe('the header of an app dialog', () => {
	it('cuts a long title on one line only from the tablet width up', () => {
		const { title } = renderHeader();

		expect(classesOf(title)).toContain('sm:truncate');
		expect(classesOf(title)).not.toContain('truncate');
	});

	it('gives a long title a second line on a phone, and the room the team chip leaves', () => {
		const { title } = renderHeader();

		expect(classesOf(title)).toEqual(expect.arrayContaining(['max-sm:line-clamp-2', 'max-sm:flex-1']));
	});

	it('grows with a title of two lines, and keeps its height for a title of one', () => {
		const { header } = renderHeader();

		expect(classesOf(header)).toContain('min-h-13');
		expect(classesOf(header)).not.toContain('h-13');
	});

	it('keeps the team chip from taking the title its room on a phone', () => {
		const { team } = renderHeader();

		expect(classesOf(team)).toEqual(expect.arrayContaining(['max-w-52', 'max-sm:max-w-36']));
	});

	it('still shows the team, the title and the close button', () => {
		renderHeader();

		expect(screen.getByText('Harbor Operations')).toBeTruthy();
		expect(screen.getByText(LONG_TITLE)).toBeTruthy();
		expect(screen.getByRole('button', { name: 'common.CLOSE' })).toBeTruthy();
	});
});
