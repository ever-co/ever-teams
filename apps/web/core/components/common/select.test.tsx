/** @jest-environment jsdom */

import { render, screen } from '@testing-library/react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';

function TaskSelect({ value }: Readonly<{ value: string }>) {
	return (
		<Select value={value}>
			<SelectTrigger aria-label="task">
				<SelectValue placeholder="Select a task" />
			</SelectTrigger>
			<SelectContent>
				<SelectItem value="first">First task</SelectItem>
				<SelectItem value="second">Second task</SelectItem>
			</SelectContent>
		</Select>
	);
}

describe('Select', () => {
	it('shows the label of a value set from outside after the placeholder was shown', () => {
		const { rerender } = render(<TaskSelect value="" />);
		const trigger = screen.getByRole('combobox');
		expect(trigger.textContent).toBe('Select a task');

		rerender(<TaskSelect value="second" />);

		expect(trigger.textContent).toBe('Second task');
	});

	it('shows the placeholder again when the value is cleared from outside', () => {
		const { rerender } = render(<TaskSelect value="first" />);
		const trigger = screen.getByRole('combobox');
		expect(trigger.textContent).toBe('First task');

		rerender(<TaskSelect value="" />);

		expect(trigger.textContent).toBe('Select a task');
	});
});
