/** @jest-environment jsdom */

import React, { useState } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { TimeImportRow } from '@/core/lib/utils/time-import-rows';
import { TimeImportPlaceholderOffer } from './time-import-placeholder-offer';

type OfferProps = React.ComponentProps<typeof TimeImportPlaceholderOffer>;

/** The page keeps who Gauzy said is outside the team: the offer leaves the screen while the file is checked again. */
function Offer(props: Readonly<Omit<OfferProps, 'notInTeamKeys' | 'onNotInTeam'>>) {
	const [notInTeamKeys, setNotInTeamKeys] = useState<ReadonlyArray<string>>([]);
	return (
		<TimeImportPlaceholderOffer
			{...props}
			notInTeamKeys={notInTeamKeys}
			onNotInTeam={(keys) => setNotInTeamKeys((current) => [...current, ...keys])}
		/>
	);
}

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
		render(<Offer rows={ROWS} onAdd={onAdd} onAdded={onAdded} />);

		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: /timeImport\.placeholders\.ADD/ }));
		});

		expect(onAdd).toHaveBeenCalledWith([
			{ firstName: 'paul.martin', email: 'paul.martin@example.com' },
			{ firstName: 'Lena', lastName: 'Weber' },
			{ firstName: 'ana', email: 'ana@example.com' }
		]);
		expect(onAdded).toHaveBeenCalledWith([
			{ employeeId: 'employee-paul', email: 'paul.martin@example.com', name: 'paul.martin' },
			{ employeeId: 'employee-lena', email: '', name: 'Lena Weber' }
		]);
		// Ana already belongs to the organization, outside this team: she is not offered again
		expect(screen.getByText(/OUTSIDE_TEAM_TITLE/)).toBeTruthy();
	});

	it('says why when Gauzy refuses, and offers again', async () => {
		const onAdd = jest.fn().mockRejectedValue({ response: { status: 403, data: { statusCode: 403 } } });
		render(<Offer rows={ROWS} onAdd={onAdd} onAdded={jest.fn()} />);

		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: /timeImport\.placeholders\.ADD/ }));
		});

		expect(screen.getByRole('alert').textContent).toContain('toasts.REASONS.PERMISSION');
		expect(screen.getByRole('button', { name: /timeImport\.placeholders\.ADD/ })).toBeTruthy();
	});

	it('shows nothing for a file whose people are all in the team', () => {
		const { container } = render(
			<Offer rows={[rowOf(2, 'x@example.com', 'projectUnknown')]} onAdd={jest.fn()} onAdded={jest.fn()} />
		);
		expect(container.textContent).toBe('');
	});
});
