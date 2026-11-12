/** @jest-environment jsdom */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { EDocumentKind, EDocumentVisibility } from '@/core/types/interfaces/common/docs';
import type { IDocumentImport } from '@/core/types/interfaces/common/docs-import';

type MockRun = {
	step: 'pick' | 'uploading' | 'running' | 'done';
	uploadPercent: number;
	current: IDocumentImport | null;
	error: string | null;
	trackingError: boolean;
	retryRead: jest.Mock;
	inProgress: boolean;
	start: jest.Mock;
	reset: jest.Mock;
};
let mockRun: MockRun;
// The key, then its values: what the dialog asked for is what the suite reads.
const mockT = (key: string, values?: Record<string, unknown>) => (values ? `${key} ${JSON.stringify(values)}` : key);
jest.mock('next-intl', () => ({ useTranslations: () => mockT }));
jest.mock('@/core/components/common/dialog', () => {
	const Pass = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
	return { Dialog: Pass, DialogContent: Pass, DialogDescription: Pass, DialogFooter: Pass, DialogHeader: Pass, DialogTitle: Pass };
});
jest.mock('@/core/components/duplicated-components/_button', () => ({
	Button: ({ children, onClick, disabled }: { children?: React.ReactNode; onClick?: () => void; disabled?: boolean }) => (
		<button type="button" onClick={onClick} disabled={disabled}>
			{children}
		</button>
	)
}));
jest.mock('@/core/components/icons', () => ({ FileZip: () => null, Spinner: () => null }));
jest.mock('@/core/lib/helpers', () => ({ cn: (...classes: unknown[]) => classes.filter(Boolean).join(' ') }));

import { DocsImportDialog } from './docs-import-dialog';

const running = (processed: number, extra: Partial<IDocumentImport> = {}): IDocumentImport => ({
	id: 'import-1',
	status: 'RUNNING',
	phase: 'TREE',
	fileName: 'vault.zip',
	totalItems: 10,
	processedItems: processed,
	importedCount: 0,
	skippedCount: 0,
	failedCount: 0,
	...extra
});

function renderDialog(props: Partial<React.ComponentProps<typeof DocsImportDialog>> = {}) {
	const handlers = { onOpenPage: jest.fn(), onClose: jest.fn() };
	render(
		<DocsImportDialog
			open
			maxZipBytes={1000}
			parent={null}
			teamSpaces={[{ kind: 'team', organizationTeamId: 'team-1', name: 'API', documentCount: 0 }]}
			run={mockRun as never}
			{...handlers}
			{...props}
		/>
	);
	return handlers;
}

function pick(name: string, size = 10, type = 'application/zip') {
	const input = screen.getByLabelText('docs.IMPORT.CHOOSE_FILE') as HTMLInputElement;
	fireEvent.change(input, { target: { files: [new File(['x'.repeat(size)], name, { type })] } });
}

describe('DocsImportDialog', () => {
	beforeEach(() => {
		mockRun = {
			step: 'pick',
			uploadPercent: 0,
			current: null,
			error: null,
			trackingError: false,
			retryRead: jest.fn(),
			inProgress: false,
			start: jest.fn(),
			reset: jest.fn()
		};
	});

	it('offers the open page, the workspace, the team spaces and private; the open page first', () => {
		renderDialog({ parent: { id: 'page-1', name: 'Handbook' } });
		const radios = screen.getAllByRole('radio');
		expect(radios.map((radio) => radio.textContent)).toEqual([`docs.IMPORT.UNDER {"title":"Handbook"}`, 'docs.WORKSPACE', 'API', 'docs.PRIVATE']);
		expect(radios[0].getAttribute('aria-checked')).toBe('true');
	});

	it('starts the import of a zip into the chosen team space', () => {
		renderDialog();
		pick('vault.zip');
		fireEvent.click(screen.getByText('API'));
		fireEvent.click(screen.getByText('docs.IMPORT.START'));
		expect(mockRun.start).toHaveBeenCalledWith(expect.any(File), { visibility: EDocumentVisibility.TEAM, organizationTeamId: 'team-1' });
	});

	it('refuses what is not a zip, and a zip over the limit, before uploading', () => {
		renderDialog();
		pick('notes.md', 10, 'text/markdown');
		expect(screen.getByRole('alert').textContent).toContain('docs.IMPORT.ERROR.NOT_A_ZIP');
		pick('big.zip', 2000);
		expect(screen.getByRole('alert').textContent).toContain('docs.IMPORT.ERROR.TOO_LARGE');
		expect((screen.getByText('docs.IMPORT.START') as HTMLButtonElement).disabled).toBe(true);
		expect(mockRun.start).not.toHaveBeenCalled();
	});

	it("shows the platform's refusal of a zip", () => {
		mockRun.error = 'DOCS_IMPORT_SYMLINK';
		renderDialog();
		expect(screen.getByRole('alert').textContent).toContain('docs.IMPORT.ERROR.SYMLINK');
	});

	it('shows the phase and the progress of a running import', () => {
		mockRun = { ...mockRun, step: 'running', current: running(4) };
		renderDialog();
		expect(screen.getByText('docs.IMPORT.PHASE.TREE')).toBeTruthy();
		expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('40');
	});

	it('says when the progress cannot be read, and reads it again on demand', () => {
		mockRun = { ...mockRun, step: 'running', inProgress: true, trackingError: true, current: running(4) };
		renderDialog();
		expect(screen.getByRole('alert').textContent).toContain('docs.IMPORT.TRACKING_ERROR');
		fireEvent.click(screen.getByText('docs.RETRY'));
		expect(mockRun.retryRead).toHaveBeenCalled();
	});

	it('counts the items not imported past the rows it lists', () => {
		const items = Array.from({ length: 103 }, (_, index) => ({ path: `V/file-${index}.exe`, kind: EDocumentKind.FILE, status: 'SKIPPED' as const, reason: 'UNSUPPORTED_TYPE' }));
		mockRun = { ...mockRun, step: 'done', current: running(10, { status: 'COMPLETED', phase: 'DONE', skippedCount: 103, report: { items } }) };
		renderDialog();
		expect(screen.getAllByText('docs.IMPORT.REASON.UNSUPPORTED_TYPE')).toHaveLength(100);
		expect(screen.getByText('docs.IMPORT.MORE {"count":3}')).toBeTruthy();
	});

	it('reports the imported pages to open and what was not imported', () => {
		mockRun = {
			...mockRun,
			step: 'done',
			current: running(10, {
				status: 'COMPLETED',
				phase: 'DONE',
				importedCount: 1,
				skippedCount: 1,
				report: {
					items: [
						{ path: 'V/Home.md', kind: EDocumentKind.PAGE, status: 'IMPORTED', documentId: 'page-9', name: 'Home' },
						{ path: 'V/tool.exe', kind: EDocumentKind.FILE, status: 'SKIPPED', reason: 'UNSUPPORTED_TYPE' }
					]
				}
			})
		};
		const handlers = renderDialog();
		expect(screen.getByText('V/tool.exe')).toBeTruthy();
		expect(screen.getByText('docs.IMPORT.REASON.UNSUPPORTED_TYPE')).toBeTruthy();
		fireEvent.click(screen.getByText('Home'));
		expect(handlers.onOpenPage).toHaveBeenCalledWith('page-9');
	});

	it('says why a failed import failed', () => {
		mockRun = { ...mockRun, step: 'done', current: running(2, { status: 'FAILED', errorCode: 'DOCS_IMPORT_NO_PAGES' }) };
		renderDialog();
		expect(screen.getByText(/docs\.IMPORT\.ERROR\.NO_PAGES/)).toBeTruthy();
	});
});
