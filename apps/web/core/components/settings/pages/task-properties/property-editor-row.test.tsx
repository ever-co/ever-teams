/** @jest-environment jsdom */
import { act, fireEvent, render, screen } from '@testing-library/react';

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string, values?: Record<string, unknown>) =>
		values && Object.keys(values).length > 0 ? `${key}:${JSON.stringify(values)}` : key
}));

import { labelNameKeyOf } from '@/core/lib/utils/task-label-catalog';
import { PropertyEditorRow } from './property-editor-row';

const TEAM_LABELS = ['Bug', 'Follow-up'];
const isNameTaken = (name: string) => TEAM_LABELS.some((label) => labelNameKeyOf(label) === labelNameKeyOf(name));

function renderRow(onSave = jest.fn().mockResolvedValue(undefined)) {
	render(
		<PropertyEditorRow
			kind="label"
			mode="create"
			initialDraft={{ name: '', color: '#6366F1', icon: null, template: null }}
			isNameTaken={isNameTaken}
			onCancel={jest.fn()}
			onSave={onSave}
		/>
	);
	return { onSave };
}

async function submitName(name: string) {
	fireEvent.change(screen.getByLabelText('common.NAME'), { target: { value: name } });
	await act(async () => {
		fireEvent.click(screen.getByRole('button', { name: 'settings.taskProperties.ADD:{"kind":"label"}' }));
	});
}

describe('PropertyEditorRow, a label name the team has already', () => {
	it('refuses it, whatever its case or dashes, and saves nothing', async () => {
		const { onSave } = renderRow();

		await submitName('  follow up ');

		expect(screen.getByText('settings.taskProperties.NAME_TAKEN:{"kind":"label"}')).toBeTruthy();
		expect(onSave).not.toHaveBeenCalled();
	});

	it('saves a name the team does not have', async () => {
		const { onSave } = renderRow();

		await submitName('Feature');

		expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ name: 'Feature' }));
	});
});
