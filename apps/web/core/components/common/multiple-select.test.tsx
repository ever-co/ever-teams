/** @jest-environment jsdom */

import { render, screen } from '@testing-library/react';
import { CustomSelect } from './multiple-select';

const members = [
	{ id: 'ada', name: 'Ada' },
	{ id: 'lin', name: 'Lin' }
];

describe('CustomSelect', () => {
	it('shows an option rendered as an element, not the text an element converts to', () => {
		render(
			<CustomSelect options={members} value="lin" renderOption={(member) => <strong>{member.name}</strong>} />
		);

		expect(screen.getByRole('combobox').textContent).toBe('Lin');
	});

	it('shows an option rendered as text', () => {
		render(<CustomSelect options={members} value="ada" renderOption={(member) => member.name} />);

		expect(screen.getByRole('combobox').textContent).toBe('Ada');
	});

	it('leaves out an option that renders to nothing', () => {
		render(<CustomSelect options={members} value="ada" renderOption={() => ''} />);

		expect(screen.getByRole('combobox').textContent).toBe('');
	});
});
