/** @jest-environment jsdom */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { TimeImportAccess } from '@/core/hooks/timesheet/use-time-import-access';
import type { WorkspaceCreationState } from '@/core/hooks/timesheet/use-workspace-import';
import type { WorkspaceFiles } from '@/core/lib/utils/workspace-import-files';
import type { WorkspaceImportPlan } from '@/core/lib/utils/workspace-import-plan';

// The keys stand for the texts, followed by the values they are given
function translate(key: string, values?: Record<string, unknown>) {
	if (!values) {
		return key;
	}
	return `${key} ${JSON.stringify(values)}`;
}

const mockWorkspace = jest.fn();

jest.mock('next-intl', () => ({
	useTranslations: () => translate,
	useLocale: () => 'en'
}));
jest.mock('@/core/components/icons', () => ({ Lock: () => null, Spinner: () => null }));
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
jest.mock('@/core/hooks/timesheet/use-workspace-import', () => ({ useWorkspaceImport: () => mockWorkspace() }));
jest.mock('./use-time-import-report-download', () => ({ useTimeImportReportDownload: () => jest.fn() }));
jest.mock('./workspace-import-upload', () => ({
	WorkspaceImportUpload: ({ onFiles }: { onFiles: (files: File[]) => void }) => (
		<button type="button" onClick={() => onFiles([new File(['x'], 'clients.csv')])}>
			upload
		</button>
	)
}));
jest.mock('./workspace-import-files', () => ({
	WorkspaceImportFiles: ({ onChooseOther }: { onChooseOther?: () => void }) => (
		<div data-testid="files">{onChooseOther && <button type="button">choose other</button>}</div>
	)
}));
jest.mock('./workspace-import-plan-panel', () => ({
	WorkspaceImportPlanPanel: ({ readyEntryCount }: { readyEntryCount: number }) => (
		<div data-testid="plan">ready {readyEntryCount}</div>
	)
}));
jest.mock('./workspace-import-progress', () => ({
	WorkspaceImportProgress: ({ hasEntries }: { hasEntries: boolean }) => (
		<div data-testid="progress">{String(hasEntries)}</div>
	)
}));
jest.mock('./time-import-result', () => ({ TimeImportResult: () => <div data-testid="entries" /> }));
jest.mock('./time-import-columns-step', () => ({ TimeImportColumnsStep: () => <div data-testid="columns" /> }));
jest.mock('./time-import-checking', () => ({ TimeImportChecking: () => <div data-testid="checking" /> }));

import { WorkspaceImportFlow } from './workspace-import-flow';

const ACCESS = { teamName: 'Team A', canImportForOthers: true } as unknown as TimeImportAccess;

const FILES: WorkspaceFiles = { clients: null, projects: null, tags: null, entries: null, read: [], problems: [] };

const PLAN = {
	clients: { create: ['Acme'], reuse: [] },
	projects: { create: [], reuse: [] },
	labels: { create: [], reuse: [] },
	entriesByMember: [],
	unknownEmails: [],
	taggedEntryCount: 0
} as WorkspaceImportPlan;

const IDLE: WorkspaceCreationState = { status: 'idle', tallies: null, failure: null };

function workspaceOf(patch: Record<string, unknown> = {}, timeImportPatch: Record<string, unknown> = {}) {
	return {
		rights: { canStart: true, canCreateLabels: true },
		files: null,
		isReading: false,
		hasEntries: false,
		creationSavesEntries: false,
		isLoadingExisting: false,
		hasExistingFailed: false,
		retryExisting: jest.fn(),
		plan: null,
		creationPlan: null,
		creation: IDLE,
		timeImport: {
			stage: 'idle',
			fileName: '',
			fileProblem: null,
			columnsStep: null,
			summary: { readyCount: 0 },
			...timeImportPatch
		},
		chooseFiles: jest.fn(),
		confirm: jest.fn(),
		reset: jest.fn(),
		...patch
	};
}

function renderFlow() {
	return render(<WorkspaceImportFlow access={ACCESS} modeSwitch={<div data-testid="mode-switch" />} />);
}

describe('WorkspaceImportFlow', () => {
	it('tells a role that cannot add clients and projects why it cannot start, and still lets it switch', () => {
		mockWorkspace.mockReturnValue(workspaceOf({ rights: { canStart: false, canCreateLabels: false } }));
		renderFlow();

		expect(screen.getByText('timeImport.workspace.NO_RIGHTS_TITLE')).toBeTruthy();
		expect(screen.getByTestId('mode-switch')).toBeTruthy();
		expect(screen.queryByRole('button', { name: 'upload' })).toBeNull();
	});

	it('offers the switch and the drop zone first, and reads the files dropped', () => {
		const workspace = workspaceOf();
		mockWorkspace.mockReturnValue(workspace);
		renderFlow();

		fireEvent.click(screen.getByRole('button', { name: 'upload' }));

		expect(screen.getByTestId('mode-switch')).toBeTruthy();
		expect(workspace.chooseFiles).toHaveBeenCalled();
	});

	it('says it reads the files', () => {
		mockWorkspace.mockReturnValue(workspaceOf({ isReading: true }));
		renderFlow();

		expect(screen.getByText('timeImport.workspace.READING')).toBeTruthy();
		expect(screen.queryByTestId('mode-switch')).toBeNull();
	});

	it('shows the files, the plan and the entries before anything is saved', () => {
		mockWorkspace.mockReturnValue(
			workspaceOf({ files: FILES, hasEntries: true, plan: PLAN }, { stage: 'preview', summary: { readyCount: 200 } })
		);
		renderFlow();

		expect(screen.getByRole('button', { name: 'choose other' })).toBeTruthy();
		expect(screen.getByTestId('plan').textContent).toBe('ready 200');
		expect(screen.getByTestId('entries')).toBeTruthy();
		expect(screen.queryByTestId('progress')).toBeNull();
	});

	it('shows the steps alone while the lists are created, with no way to choose other files', () => {
		const creation: WorkspaceCreationState = { status: 'creating', tallies: null, failure: null };
		mockWorkspace.mockReturnValue(
			workspaceOf(
				{ files: FILES, hasEntries: true, plan: PLAN, creationPlan: PLAN, creation, creationSavesEntries: true },
				{ stage: 'preview', summary: { readyCount: 200 } }
			)
		);
		renderFlow();

		expect(screen.getByTestId('progress').textContent).toBe('true');
		expect(screen.queryByTestId('plan')).toBeNull();
		expect(screen.queryByTestId('entries')).toBeNull();
		expect(screen.queryByRole('button', { name: 'choose other' })).toBeNull();
	});

	it('keeps the entries out when a step failed', () => {
		const creation: WorkspaceCreationState = {
			status: 'failed',
			tallies: null,
			failure: { step: 'clients', name: 'Acme', reasonKey: 'toasts.REASONS.PERMISSION' }
		};
		mockWorkspace.mockReturnValue(
			workspaceOf(
				{ files: FILES, hasEntries: true, plan: PLAN, creationPlan: PLAN, creation },
				{ stage: 'preview', summary: { readyCount: 200 } }
			)
		);
		renderFlow();

		expect(screen.getByTestId('progress')).toBeTruthy();
		expect(screen.queryByTestId('entries')).toBeNull();
		expect(screen.getByRole('button', { name: 'choose other' })).toBeTruthy();
	});

	it('shows the entries as they are saved once the lists exist', () => {
		const creation: WorkspaceCreationState = { status: 'created', tallies: null, failure: null };
		mockWorkspace.mockReturnValue(
			workspaceOf(
				{ files: FILES, hasEntries: true, creationPlan: PLAN, creation, creationSavesEntries: true },
				{ stage: 'importing', summary: { readyCount: 200 } }
			)
		);
		renderFlow();

		expect(screen.getByTestId('progress')).toBeTruthy();
		expect(screen.getByTestId('entries')).toBeTruthy();
		expect(screen.queryByRole('button', { name: 'choose other' })).toBeNull();
	});

	it('says why the time import refused the entries file', () => {
		mockWorkspace.mockReturnValue(
			workspaceOf(
				{ files: FILES, hasEntries: true },
				{ fileName: 'time.csv', fileProblem: { code: 'tooManyRows', count: 900 } }
			)
		);
		renderFlow();

		expect(screen.getByText('timeImport.FILE_PROBLEM_TITLE {"fileName":"time.csv"}')).toBeTruthy();
	});

	it('offers to read the workspace again when its clients and projects could not be read', () => {
		const workspace = workspaceOf({ files: FILES, hasExistingFailed: true });
		mockWorkspace.mockReturnValue(workspace);
		renderFlow();

		fireEvent.click(screen.getByRole('button', { name: 'timeImport.RETRY' }));

		expect(screen.getByText('timeImport.workspace.EXISTING_FAILED_TITLE')).toBeTruthy();
		expect(workspace.retryExisting).toHaveBeenCalled();
	});
});
