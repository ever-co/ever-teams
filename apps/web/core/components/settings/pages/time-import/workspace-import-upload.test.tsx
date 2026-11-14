/** @jest-environment jsdom */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

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

import { WorkspaceImportUpload } from './workspace-import-upload';

const clients = new File(['Name\nAcme\n'], 'clients.csv', { type: 'text/csv' });
const archive = new File(['PK'], 'export.zip', { type: 'application/zip' });

describe('WorkspaceImportUpload', () => {
	it('takes every file chosen at once: CSV, JSON or ZIP', () => {
		const onFiles = jest.fn();
		render(<WorkspaceImportUpload teamName="Team A" onFiles={onFiles} />);
		const input = screen.getByTestId('workspace-import-files');

		fireEvent.change(input, { target: { files: [clients, archive] } });

		expect(input.hasAttribute('multiple')).toBe(true);
		expect(input.getAttribute('accept')).toBe('.csv,.json,.zip,text/csv,application/json,application/zip');
		expect(onFiles).toHaveBeenCalledWith([clients, archive]);
	});

	it('takes every file dropped at once, and says it reads them while they are dragged over', () => {
		const onFiles = jest.fn();
		render(<WorkspaceImportUpload teamName="Team A" onFiles={onFiles} />);
		const zone = screen.getByRole('button', { name: 'timeImport.workspace.DROP_TITLE' });
		const dataTransfer = { types: ['Files'], files: [clients, archive] };

		fireEvent.dragOver(zone, { dataTransfer });
		expect(screen.getByRole('button', { name: 'timeImport.workspace.DROP_ACTIVE' })).toBeTruthy();
		fireEvent.drop(zone, { dataTransfer });

		expect(onFiles).toHaveBeenCalledWith([clients, archive]);
	});

	it('names the team the export goes to and the size each file may have', () => {
		render(<WorkspaceImportUpload teamName="Team A" onFiles={jest.fn()} />);

		expect(screen.getByText('timeImport.workspace.SECTION_DESCRIPTION {"team":"Team A"}')).toBeTruthy();
		expect(screen.getByText('timeImport.workspace.DROP_HINT {"megabytes":10}')).toBeTruthy();
	});
});
