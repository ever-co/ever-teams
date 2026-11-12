/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { PropertyIconPanel } from './property-icon-panel';

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string) => key
}));

const buttonNames = () => screen.getAllByRole('button').map((button) => button.getAttribute('aria-label'));

describe('PropertyIconPanel button names', () => {
	it.each(['status', 'priority', 'size', 'issueType'] as const)(
		'gives every icon of a %s a name of its own',
		(kind) => {
			render(<PropertyIconPanel kind={kind} value={null} onPick={jest.fn()} />);

			const names = buttonNames();
			const repeated = names.filter((name, index) => names.indexOf(name) !== index);

			expect(names.length).toBeGreaterThan(0);
			expect(repeated).toEqual([]);
		}
	);

	it('names a classic icon with the property it was drawn for, and a library icon by its words', () => {
		render(<PropertyIconPanel kind="status" value={null} onPick={jest.fn()} />);

		expect(screen.getByRole('button', { name: 'medium (taskMenus.fields.size)' })).toBeTruthy();
		expect(screen.getByRole('button', { name: 'medium (taskMenus.fields.priority)' })).toBeTruthy();
		expect(screen.getByRole('button', { name: 'in progress (taskMenus.fields.status)' })).toBeTruthy();
		expect(screen.getByRole('button', { name: 'in progress' })).toBeTruthy();
	});
});
