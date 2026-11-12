/** @jest-environment jsdom */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { TimeImportFileProblem } from '@/core/lib/utils/time-import-sheet';

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
jest.mock('@/core/components/icons', () => ({ Download: () => null, FileCsv: () => null, Upload: () => null }));
jest.mock('@/core/components/common/notice', () => ({
	Notice: ({ title, description }: { title: React.ReactNode; description?: React.ReactNode }) => (
		<output>
			<p>{title}</p>
			<p>{description}</p>
		</output>
	)
}));

import { useTimeImportCopy } from './time-import-copy';
import { TimeImportUpload } from './time-import-upload';

interface HarnessProps {
	canImportForOthers?: boolean;
	fileProblem?: TimeImportFileProblem | null;
	onFile?: (file: File) => void;
	onDownloadTemplate?: () => void;
}

function Harness({
	canImportForOthers = false,
	fileProblem = null,
	onFile,
	onDownloadTemplate
}: Readonly<HarnessProps>) {
	const copy = useTimeImportCopy();
	return (
		<TimeImportUpload
			teamName="Team A"
			canImportForOthers={canImportForOthers}
			refusedFileName="october.xlsx"
			fileProblem={fileProblem}
			copy={copy}
			onFile={(file) => onFile?.(file as File)}
			onDownloadTemplate={onDownloadTemplate ?? jest.fn()}
		/>
	);
}

const csvFile = new File(['date,start time,end time\n'], 'october.csv', { type: 'text/csv' });

describe('TimeImportUpload', () => {
	it('states the limits of a file next to the place it is dropped', () => {
		render(<Harness />);

		expect(screen.getByText('timeImport.DROP_HINT {"megabytes":1,"rows":500}')).toBeTruthy();
		expect(screen.getByRole('button', { name: 'timeImport.DROP_TITLE' })).toBeTruthy();
	});

	it('offers only CSV files in the file picker', () => {
		render(<Harness />);

		expect(screen.getByTestId('time-import-file').getAttribute('accept')).toBe('.csv,text/csv');
	});

	it('hands over the picked file', () => {
		const onFile = jest.fn();
		render(<Harness onFile={onFile} />);

		fireEvent.change(screen.getByTestId('time-import-file'), { target: { files: [csvFile] } });

		expect(onFile).toHaveBeenCalledWith(csvFile);
	});

	it('hands over a dropped file', () => {
		const onFile = jest.fn();
		render(<Harness onFile={onFile} />);
		const zone = screen.getByRole('button', { name: 'timeImport.DROP_TITLE' });

		fireEvent.drop(zone, { dataTransfer: { files: [csvFile], types: ['Files'] } });

		expect(onFile).toHaveBeenCalledWith(csvFile);
	});

	it('downloads the template on its button', () => {
		const onDownloadTemplate = jest.fn();
		render(<Harness onDownloadTemplate={onDownloadTemplate} />);

		fireEvent.click(screen.getByRole('button', { name: 'timeImport.TEMPLATE_DOWNLOAD' }));

		expect(onDownloadTemplate).toHaveBeenCalledTimes(1);
	});

	it('says why the last file was refused, and stays ready for another one', () => {
		render(<Harness fileProblem={{ code: 'tooManyRows', count: 812 }} />);

		expect(screen.getByText('timeImport.FILE_PROBLEM_TITLE {"fileName":"october.xlsx"}')).toBeTruthy();
		expect(screen.getByText('timeImport.fileProblems.TOO_MANY_ROWS {"count":812,"limit":500}')).toBeTruthy();
		expect(screen.getByRole('button', { name: 'timeImport.DROP_TITLE' })).toBeTruthy();
	});

	it('tells whose time the rows are: the viewer own, or a named member for who may add time for others', () => {
		const { rerender } = render(<Harness />);

		expect(screen.getByText('timeImport.OWN_TIME_NOTE')).toBeTruthy();

		rerender(<Harness canImportForOthers />);

		expect(screen.getByText('timeImport.OTHERS_NOTE {"team":"Team A","column":"member email"}')).toBeTruthy();
	});
});
