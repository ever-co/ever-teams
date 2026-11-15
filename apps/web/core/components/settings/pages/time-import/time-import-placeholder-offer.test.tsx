/** @jest-environment jsdom */

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { TimeImportRow } from '@/core/lib/utils/time-import-rows';
import { TimeImportPlaceholderOffer } from './time-import-placeholder-offer';

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string, values?: Record<string, unknown>) =>
		values ? `${key} ${JSON.stringify(values)}` : key
}));
jest.mock('@/core/components/icons', () => ({ Spinner: () => null, User: () => null }));
jest.mock('@/core/components/common/notice', () => ({
	Notice: ({
		title,
		description,
		actions
	}: {
		title: string;
		description?: React.ReactNode;
		actions?: React.ReactNode;
	}) => (
		<section>
			<h2>{title}</h2>
			{description}
			{actions}
		</section>
	)
}));

function rowOf(row: number, memberEmail: string, code: string): TimeImportRow {
	return { row, cells: { memberEmail }, entry: null, problems: [{ code }] } as unknown as TimeImportRow;
}

const ROWS = [
	rowOf(2, 'paul.martin@example.com', 'memberUnknown'),
	rowOf(3, 'paul.martin@example.com', 'memberUnknown'),
	rowOf(4, 'Lena Weber', 'memberNameUnknown'),
	rowOf(5, 'ana@example.com', 'memberUnknown')
];

describe('the offer to add the people of a file that nobody in the team is', () => {
	it('adds them without an account and checks the file again with the members created', async () => {
		const onAdd = jest.fn().mockResolvedValue([
			{ employee: { id: 'employee-paul' }, created: true },
			{ employee: { id: 'employee-lena' }, created: true },
			{ employee: { id: 'employee-ana' }, created: false }
		]);
		const onAdded = jest.fn();
		render(
			<TimeImportPlaceholderOffer
				previewRun={7}
				outsideTeamKeys={[]}
				rows={ROWS}
				onAdd={onAdd}
				onAdded={onAdded}
			/>
		);

		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: /timeImport\.placeholders\.ADD/ }));
		});

		expect(onAdd).toHaveBeenCalledWith([
			{ firstName: 'paul.martin', email: 'paul.martin@example.com' },
			{ firstName: 'Lena', lastName: 'Weber' },
			{ firstName: 'ana', email: 'ana@example.com' }
		]);
		// The recheck goes with the preview the offer was made on, and keeps Ana, whom the organization has outside the team
		expect(onAdded).toHaveBeenCalledWith(
			[
				{ employeeId: 'employee-paul', email: 'paul.martin@example.com', name: 'paul.martin' },
				{ employeeId: 'employee-lena', email: '', name: 'Lena Weber' }
			],
			7,
			['ana@example.com']
		);
	});

	it('says to add a person of the organization to the team first, and does not offer them again', () => {
		render(
			<TimeImportPlaceholderOffer
				previewRun={8}
				outsideTeamKeys={['ana@example.com']}
				rows={ROWS}
				onAdd={jest.fn()}
				onAdded={jest.fn()}
			/>
		);

		expect(screen.getByText(/OUTSIDE_TEAM_TITLE/)).toBeTruthy();
		expect(screen.getByRole('button', { name: /timeImport.placeholders.ADD/ }).textContent).toContain('"count":2');
	});

	it('says why when Gauzy refuses, and offers again', async () => {
		const onAdd = jest.fn().mockRejectedValue({ response: { status: 403, data: { statusCode: 403 } } });
		render(
			<TimeImportPlaceholderOffer
				previewRun={7}
				outsideTeamKeys={[]}
				rows={ROWS}
				onAdd={onAdd}
				onAdded={jest.fn()}
			/>
		);

		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: /timeImport\.placeholders\.ADD/ }));
		});

		expect(screen.getByRole('alert').textContent).toContain('toasts.REASONS.PERMISSION');
		expect(screen.getByRole('button', { name: /timeImport\.placeholders\.ADD/ })).toBeTruthy();
	});

	it('shows nothing for a file whose people are all in the team', () => {
		const { container } = render(
			<TimeImportPlaceholderOffer
				previewRun={1}
				outsideTeamKeys={[]}
				rows={[rowOf(2, 'x@example.com', 'projectUnknown')]}
				onAdd={jest.fn()}
				onAdded={jest.fn()}
			/>
		);
		expect(container.textContent).toBe('');
	});
});
