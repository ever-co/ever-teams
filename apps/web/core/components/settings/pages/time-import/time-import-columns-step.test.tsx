/** @jest-environment jsdom */

import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { timeImportColumnsStepOf } from '@/core/lib/utils/time-import-columns';
import {
	NO_TIME_IMPORT_COLUMNS,
	timeImportTableOf,
	type TimeImportColumnsChoice,
	type TimeImportTable
} from '@/core/lib/utils/time-import-sheet';

type MockSelectProps = React.PropsWithChildren<{ value?: string; onValueChange?: (value: string) => void }>;

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
// Each option is a button that picks its value, inside a container the test can scope to
jest.mock('@/core/components/common/select', () => {
	const ReactModule = jest.requireActual<typeof React>('react');
	const PickContext = ReactModule.createContext<(value: string) => void>(() => undefined);
	function MockSelect({ value, onValueChange, children }: MockSelectProps) {
		const pick = (next: string) => onValueChange?.(next);
		return (
			<PickContext.Provider value={pick}>
				<div data-select="" data-value={value}>
					{children}
				</div>
			</PickContext.Provider>
		);
	}
	function MockSelectItem({ value, children }: React.PropsWithChildren<{ value: string }>) {
		const pick = ReactModule.useContext(PickContext);
		return (
			<button type="button" role="option" aria-selected={false} onClick={() => pick(value)}>
				{children}
			</button>
		);
	}
	return {
		Select: MockSelect,
		SelectTrigger: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
			<button type="button" {...props}>
				{children}
			</button>
		),
		SelectValue: ({ children, placeholder }: { children?: React.ReactNode; placeholder?: React.ReactNode }) => (
			<span>{children || placeholder}</span>
		),
		SelectContent: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
		SelectItem: MockSelectItem
	};
});

import { TimeImportColumnsStep } from './time-import-columns-step';
import { useTimeImportCopy } from './time-import-copy';

function tableOf(text: string): TimeImportTable {
	const reading = timeImportTableOf(text);
	if (!reading.table) {
		throw new Error(`The file was refused: ${reading.problem.code}`);
	}
	return reading.table;
}

const TABLE = tableOf(
	'Datum,Beginn,Ende,Kunde,Notiz\n03/11/2026,09:00,10:30,Acme,<b>Pairing</b>\n05/11/2026,13:00,14:00,Acme,\n'
);

const CHOSEN = { ...NO_TIME_IMPORT_COLUMNS, date: 0, startTime: 1, endTime: 2, notes: 4 };

const CHECK_BUTTON = 'timeImport.mapping.CONTINUE {"count":2}';

interface Handlers {
	onChooseColumn: jest.Mock;
	onChooseDateOrder: jest.Mock;
	onConfirm: jest.Mock;
	onChooseAnother: jest.Mock;
}

function Harness({
	table,
	choice,
	handlers
}: Readonly<{ table: TimeImportTable; choice: TimeImportColumnsChoice; handlers: Handlers }>) {
	const copy = useTimeImportCopy();
	const step = timeImportColumnsStepOf(table, choice);
	return <TimeImportColumnsStep fileName="export.csv" step={step} copy={copy} {...handlers} />;
}

function renderStep(choice: TimeImportColumnsChoice, table = TABLE): Handlers {
	const handlers: Handlers = {
		onChooseColumn: jest.fn(),
		onChooseDateOrder: jest.fn(),
		onConfirm: jest.fn(),
		onChooseAnother: jest.fn()
	};
	render(<Harness table={table} choice={choice} handlers={handlers} />);
	return handlers;
}

function selectOf(label: RegExp): HTMLElement {
	const trigger = screen.getByLabelText(label);
	const select = trigger.closest<HTMLElement>('[data-select]');
	if (!select) {
		throw new Error('No select around this control');
	}
	return select;
}

function sampleOf(label: RegExp): string {
	const trigger = screen.getByLabelText(label);
	const sampleId = trigger.getAttribute('aria-describedby') ?? '';
	return document.getElementById(sampleId)?.textContent ?? '';
}

function checkButton(): HTMLButtonElement {
	return screen.getByRole('button', { name: CHECK_BUTTON }) as HTMLButtonElement;
}

describe('TimeImportColumnsStep', () => {
	it('shows each part of an entry with the column it is read from and the first value of that column', () => {
		renderStep({ mapping: CHOSEN, dateOrder: 'dayFirst' });

		expect(screen.getByRole('heading', { name: 'timeImport.COLUMNS_TITLE' })).toBeTruthy();
		expect(screen.getByLabelText(/^timeImport\.mapping\.fields\.DATE/).textContent).toBe('Datum');
		expect(sampleOf(/^timeImport\.mapping\.fields\.DATE/)).toBe('03/11/2026');
		expect(screen.getByLabelText(/^timeImport\.mapping\.fields\.PROJECT/).textContent).toBe(
			'timeImport.mapping.NOT_IN_FILE'
		);
		expect(sampleOf(/^timeImport\.mapping\.fields\.PROJECT/)).toBe('–');
	});

	it('offers Not in this file only for the parts an entry can do without', () => {
		renderStep({ mapping: CHOSEN, dateOrder: 'dayFirst' });
		const notInFile = { name: 'timeImport.mapping.NOT_IN_FILE' };

		expect(within(selectOf(/^timeImport\.mapping\.fields\.DATE/)).queryByRole('option', notInFile)).toBeNull();
		expect(
			within(selectOf(/^timeImport\.mapping\.fields\.START_TIME/)).queryByRole('option', notInFile)
		).toBeNull();
		expect(within(selectOf(/^timeImport\.mapping\.fields\.NOTES/)).getByRole('option', notInFile)).toBeTruthy();
	});

	it('hands the column the member picks to the import', () => {
		const handlers = renderStep({ mapping: CHOSEN, dateOrder: 'dayFirst' });

		fireEvent.click(
			within(selectOf(/^timeImport\.mapping\.fields\.PROJECT/)).getByRole('option', { name: 'Kunde' })
		);
		fireEvent.click(
			within(selectOf(/^timeImport\.mapping\.fields\.NOTES/)).getByRole('option', {
				name: 'timeImport.mapping.NOT_IN_FILE'
			})
		);

		expect(handlers.onChooseColumn.mock.calls).toEqual([
			['project', 3],
			['notes', null]
		]);
	});

	it('asks how the dates are written when they fit two formats, with the day each one makes of the first date', () => {
		const handlers = renderStep({ mapping: CHOSEN, dateOrder: null });
		const dayFirst = within(selectOf(/^timeImport\.mapping\.DATE_FORMAT/)).getByRole('option', {
			name: /DAY_FIRST/
		});

		expect(dayFirst.textContent).toContain('Nov 3, 2026');
		expect(screen.getByRole('status').textContent).toBe('timeImport.mapping.DATE_FORMAT_MISSING');
		expect(checkButton().disabled).toBe(true);

		fireEvent.click(dayFirst);

		expect(handlers.onChooseDateOrder).toHaveBeenCalledWith('dayFirst');
	});

	it('cannot check the rows while a part is missing, and says which', () => {
		const handlers = renderStep({ mapping: { ...CHOSEN, endTime: null }, dateOrder: 'dayFirst' });
		const status = screen.getByRole('status').textContent ?? '';

		expect(status).toContain('timeImport.mapping.MISSING');
		expect(status).toContain('timeImport.fileProblems.END_OR_DURATION');
		expect(checkButton().disabled).toBe(true);
		expect(checkButton().getAttribute('aria-describedby')).toBe(screen.getByRole('status').id);
		fireEvent.click(checkButton());
		expect(handlers.onConfirm).not.toHaveBeenCalled();
	});

	it('says which rows write their dates two ways', () => {
		const mixed = tableOf('Datum,Beginn,Ende\n25/10/2026,09:00,10:00\n10/25/2026,09:00,10:00\n');
		renderStep({ mapping: { ...CHOSEN, notes: null }, dateOrder: 'dayFirst' }, mixed);

		expect(screen.getByRole('status').textContent).toContain('"firstRow":2');
		expect(screen.getByRole('status').textContent).toContain('"row":3');
		expect(checkButton().disabled).toBe(true);
	});

	it('checks the rows once the date, the start, the end and the date format are settled', () => {
		const handlers = renderStep({ mapping: CHOSEN, dateOrder: 'dayFirst' });

		expect(screen.queryByRole('status')).toBeNull();
		expect(sampleOf(/^timeImport\.mapping\.DATE_FORMAT/)).toBe('03/11/2026 · Nov 3, 2026');
		fireEvent.click(checkButton());

		expect(handlers.onConfirm).toHaveBeenCalledTimes(1);
	});

	it('shows the first rows of the file, and what they hold as text only', () => {
		renderStep({ mapping: CHOSEN, dateOrder: 'dayFirst' });
		const firstRows = screen.getByRole('table', { name: 'timeImport.mapping.FIRST_ROWS' });

		expect(within(firstRows).getAllByRole('row')).toHaveLength(3);
		expect(within(firstRows).getByText('<b>Pairing</b>')).toBeTruthy();
		expect(firstRows.querySelector('b')).toBeNull();
	});

	it('names the columns it leaves out, and goes back to the file choice on request', () => {
		const handlers = renderStep({ mapping: CHOSEN, dateOrder: 'dayFirst' });

		expect(screen.getByText('timeImport.IGNORED_COLUMNS {"count":1,"columns":"Kunde"}')).toBeTruthy();
		fireEvent.click(screen.getByRole('button', { name: 'timeImport.CHOOSE_ANOTHER' }));

		expect(handlers.onChooseAnother).toHaveBeenCalledTimes(1);
	});
});
