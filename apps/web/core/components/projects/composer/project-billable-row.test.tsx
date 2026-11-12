/** @jest-environment jsdom */

import type { FormEvent } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { ProjectBillableRow } from './project-billable-row';

const LABEL = 'Billable by default';
const HELP = 'Time tracked or added on this project starts as billable.';

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string) => {
		const messages: Record<string, string> = {
			'pages.projects.detail.BILLABLE': 'Billable',
			'pages.projects.billable.LABEL': 'Billable by default',
			'pages.projects.billable.HELP': 'Time tracked or added on this project starts as billable.'
		};
		return messages[key] ?? key;
	}
}));

function renderRow(billable: boolean | null) {
	const onChange = jest.fn();
	const onSave = jest.fn((event: FormEvent<HTMLFormElement>) => event.preventDefault());
	render(
		<form onSubmit={onSave}>
			<ProjectBillableRow billable={billable} onChange={onChange} />
			<button type="submit">Save</button>
		</form>
	);
	const billableSwitch = screen.getByRole('switch', { name: LABEL });
	return { billableSwitch, onChange, onSave };
}

describe('the Billable by default switch of the project form', () => {
	it('is described by its line of help', () => {
		const { billableSwitch } = renderRow(null);

		const helpId = billableSwitch.getAttribute('aria-describedby') ?? '';
		const help = document.getElementById(helpId);

		expect(help?.textContent).toBe(HELP);
	});

	it.each([
		['on', true, 'true'],
		['off', false, 'false'],
		['off while nobody chose', null, 'false']
	])('shows %s', (_state, billable, checked) => {
		const { billableSwitch } = renderRow(billable);

		expect(billableSwitch.getAttribute('aria-checked')).toBe(checked);
	});

	it('reports the choice a click makes', () => {
		const { billableSwitch, onChange } = renderRow(null);

		fireEvent.click(billableSwitch);

		expect(onChange).toHaveBeenCalledTimes(1);
		expect(onChange).toHaveBeenCalledWith(true);
	});

	it('reports the choice the Space key makes', () => {
		const { billableSwitch, onChange } = renderRow(true);

		fireEvent.keyUp(billableSwitch, { key: ' ' });

		expect(onChange).toHaveBeenCalledWith(false);
	});

	it('does not save the form when Enter is pressed on it', () => {
		const { billableSwitch, onChange, onSave } = renderRow(null);

		fireEvent.keyUp(billableSwitch, { key: 'Enter' });

		expect(onSave).not.toHaveBeenCalled();
		expect(onChange).not.toHaveBeenCalled();
	});
});
