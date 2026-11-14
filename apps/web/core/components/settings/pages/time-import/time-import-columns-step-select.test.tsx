/** @jest-environment jsdom */

import { render, screen } from '@testing-library/react';
import { timeImportColumnsStepOf } from '@/core/lib/utils/time-import-columns';
import {
	NO_TIME_IMPORT_COLUMNS,
	timeImportTableOf,
	type TimeImportColumnsChoice,
	type TimeImportTable
} from '@/core/lib/utils/time-import-sheet';

// The keys stand for the texts, followed by the values they are given
function translate(key: string, values?: Record<string, unknown>) {
	if (!values) {
		return key;
	}
	return `${key} ${JSON.stringify(values)}`;
}

jest.mock('next-intl', () => ({
	useTranslations: () => translate,
	useLocale: () => 'en'
}));

import { TimeImportColumnsStep } from './time-import-columns-step';
import { useTimeImportCopy } from './time-import-copy';

function tableOf(text: string): TimeImportTable {
	const reading = timeImportTableOf(text);
	if (!reading.table) {
		throw new Error(`The file was refused: ${reading.problem.code}`);
	}
	return reading.table;
}

const TABLE = tableOf('Datum,Beginn,Dauer,Notiz\n03/11/2026,09:00,1:30,Planning\n');

function Harness({ choice }: Readonly<{ choice: TimeImportColumnsChoice }>) {
	const copy = useTimeImportCopy();
	const step = timeImportColumnsStepOf(TABLE, choice);
	return (
		<TimeImportColumnsStep
			fileName="export.csv"
			step={step}
			copy={copy}
			onChooseColumn={jest.fn()}
			onChooseDateOrder={jest.fn()}
			onConfirm={jest.fn()}
			onChooseAnother={jest.fn()}
		/>
	);
}

describe('TimeImportColumnsStep, with the select of the app', () => {
	it('shows the column picked for a part that starts without one', () => {
		const { rerender } = render(<Harness choice={{ mapping: NO_TIME_IMPORT_COLUMNS, dateOrder: null }} />);
		const date = screen.getByLabelText(/^timeImport\.mapping\.fields\.DATE/);
		const startTime = screen.getByLabelText(/^timeImport\.mapping\.fields\.START_TIME/);
		expect(date.textContent).toBe('timeImport.mapping.CHOOSE_COLUMN');

		rerender(<Harness choice={{ mapping: { ...NO_TIME_IMPORT_COLUMNS, date: 0 }, dateOrder: null }} />);
		rerender(
			<Harness choice={{ mapping: { ...NO_TIME_IMPORT_COLUMNS, date: 0, startTime: 1 }, dateOrder: null }} />
		);

		expect(date.textContent).toBe('Datum');
		expect(startTime.textContent).toBe('Beginn');
	});

	it('shows the columns already chosen when the step opens on them', () => {
		const chosen = { ...NO_TIME_IMPORT_COLUMNS, date: 0, startTime: 1, duration: 2, notes: 3 };
		render(<Harness choice={{ mapping: chosen, dateOrder: 'dayFirst' }} />);

		expect(screen.getByLabelText(/^timeImport\.mapping\.fields\.DATE/).textContent).toBe('Datum');
		expect(screen.getByLabelText(/^timeImport\.mapping\.fields\.START_TIME/).textContent).toBe('Beginn');
	});
});
