const mockToFile = jest.fn();
const mockWriteXlsxFile = jest.fn();

jest.mock('write-excel-file/browser', () => ({
	__esModule: true,
	default: (...args: unknown[]) => mockWriteXlsxFile(...args)
}));

import { exportToXLSX } from './export-utils';

interface Line {
	name: string;
	hours: number;
	isTotal: boolean;
}

interface WrittenColumn {
	header: { value: string; fontWeight: string };
	cell: (line: Line) => Record<string, unknown>;
	width?: number;
}

const lines: Line[] = [
	{ name: 'Ada', hours: 2, isTotal: false },
	{ name: 'Total', hours: 2, isTotal: true }
];

const columns = [
	{ header: 'Name', value: (line: Line) => line.name, width: 20 },
	{ header: 'Hours', value: (line: Line) => line.hours, format: '0.00' }
];

function writtenColumnsOf(): WrittenColumn[] {
	const [, sheet] = mockWriteXlsxFile.mock.calls[0] as [Line[], { columns: WrittenColumn[] }];
	return sheet.columns;
}

describe('exportToXLSX', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockWriteXlsxFile.mockReturnValue({ toFile: mockToFile });
	});

	it('writes every row with its values and number formats under bold headers', async () => {
		await exportToXLSX(lines, columns, 'report.xlsx');

		const [nameColumn, hoursColumn] = writtenColumnsOf();
		expect(mockWriteXlsxFile.mock.calls[0][0]).toBe(lines);
		expect(mockToFile).toHaveBeenCalledWith('report.xlsx');
		expect(nameColumn.header).toEqual({ value: 'Name', fontWeight: 'bold' });
		expect(nameColumn.width).toBe(20);
		expect(nameColumn.cell(lines[0])).toEqual({ value: 'Ada', format: undefined });
		expect(hoursColumn.cell(lines[1])).toEqual({ value: 2, format: '0.00' });
	});

	it('writes in bold the rows the caller names, such as a closing total', async () => {
		await exportToXLSX(lines, columns, 'report.xlsx', { isBoldRow: (line) => line.isTotal });

		const [nameColumn, hoursColumn] = writtenColumnsOf();
		expect(nameColumn.cell(lines[0])).toEqual({ value: 'Ada', format: undefined });
		expect(nameColumn.cell(lines[1])).toEqual({ value: 'Total', format: undefined, fontWeight: 'bold' });
		expect(hoursColumn.cell(lines[1])).toEqual({ value: 2, format: '0.00', fontWeight: 'bold' });
	});
});
