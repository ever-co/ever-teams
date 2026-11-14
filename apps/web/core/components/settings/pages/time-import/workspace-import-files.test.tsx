/** @jest-environment jsdom */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { WorkspaceFiles, WorkspaceTable } from '@/core/lib/utils/workspace-import-files';

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
jest.mock('@/core/components/icons', () => ({
	FileCsv: () => null,
	FileText: () => null,
	FileZip: () => null,
	Spinner: () => null
}));
jest.mock('@/core/components/common/notice', () => ({
	Notice: ({
		title,
		description,
		actions
	}: {
		title: React.ReactNode;
		description?: React.ReactNode;
		actions?: React.ReactNode;
	}) => (
		<output>
			<p>{title}</p>
			<div>{description}</div>
			{actions}
		</output>
	)
}));

import { WorkspaceImportFiles } from './workspace-import-files';

function tableOf(fileName: string, kind: WorkspaceTable['kind'], rowCount: number): WorkspaceTable {
	const records = Array.from({ length: rowCount }, (_, index) => ({ row: index + 2, cells: ['x'] }));
	return { fileName, kind, table: { headers: ['Name'], records } };
}

const NOTHING: WorkspaceFiles = { clients: null, projects: null, tags: null, entries: null, read: [], problems: [] };

describe('WorkspaceImportFiles', () => {
	it('lists each file read with what it holds and its rows', () => {
		const clients = tableOf('export.zip / clients.csv', 'clients', 3);
		const entries = tableOf('time.json / time_entries', 'entries', 200);
		render(
			<WorkspaceImportFiles files={{ ...NOTHING, clients, entries, read: [clients, entries] }} onChooseOther={jest.fn()} />
		);

		expect(screen.getByText('export.zip / clients.csv')).toBeTruthy();
		expect(screen.getByText('timeImport.workspace.KIND_clients')).toBeTruthy();
		expect(screen.getByText('timeImport.workspace.FILE_ROWS {"count":3}')).toBeTruthy();
		expect(screen.getByText('time.json / time_entries')).toBeTruthy();
		expect(screen.getByText('timeImport.workspace.FILE_ROWS {"count":200}')).toBeTruthy();
	});

	it('lists each file left out with the reason', () => {
		const clients = tableOf('clients.csv', 'clients', 1);
		const files: WorkspaceFiles = {
			...NOTHING,
			clients,
			read: [clients],
			problems: [
				{ code: 'zip', fileName: 'secret.zip', problem: 'encrypted' },
				{ code: 'tooLarge', fileName: 'huge.csv' },
				{ code: 'repeatedKind', fileName: 'clients (1).csv', kind: 'clients' }
			]
		};
		render(<WorkspaceImportFiles files={files} onChooseOther={jest.fn()} />);

		expect(screen.getByText('timeImport.workspace.LEFT_OUT_TITLE {"count":3}')).toBeTruthy();
		expect(screen.getByText('timeImport.workspace.problems.zip_encrypted')).toBeTruthy();
		expect(screen.getByText('timeImport.workspace.problems.tooLarge {"megabytes":10}')).toBeTruthy();
		expect(
			screen.getByText('timeImport.workspace.problems.repeatedKind {"kind":"timeImport.workspace.KIND_clients"}')
		).toBeTruthy();
		expect(screen.getByText('secret.zip')).toBeTruthy();
	});

	it('says no file could be used and offers to choose others', () => {
		const onChooseOther = jest.fn();
		const files: WorkspaceFiles = { ...NOTHING, problems: [{ code: 'notSupported', fileName: 'photo.png' }] };
		render(<WorkspaceImportFiles files={files} onChooseOther={onChooseOther} />);

		expect(screen.getByText('timeImport.workspace.NOTHING_READ')).toBeTruthy();
		expect(screen.getByText('timeImport.workspace.problems.notSupported')).toBeTruthy();
		fireEvent.click(screen.getAllByRole('button', { name: 'timeImport.workspace.CHOOSE_OTHER' })[0]);

		expect(onChooseOther).toHaveBeenCalled();
	});
});
