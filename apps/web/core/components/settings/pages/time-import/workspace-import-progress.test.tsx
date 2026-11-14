/** @jest-environment jsdom */

import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { WorkspaceCreationState } from '@/core/hooks/timesheet/use-workspace-import';
import type { WorkspaceImportPlan } from '@/core/lib/utils/workspace-import-plan';

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
	Circle: () => null,
	CircleCheck: () => null,
	CircleX: () => null,
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
// The hook module is read for its types only
jest.mock('@/core/hooks/timesheet/use-workspace-import', () => ({}));

import { WorkspaceImportProgress } from './workspace-import-progress';

const PLAN: WorkspaceImportPlan = {
	clients: { create: ['Acme', 'Globex'], reuse: [{ id: 'client-initech', name: 'Initech' }] },
	projects: { create: [{ name: 'Website', clientName: 'Acme', color: null, billable: null }], reuse: [] },
	labels: { create: ['Design'], reuse: [] },
	entriesByMember: [],
	unknownEmails: [],
	taggedEntryCount: 0
};

const tally = (created: number, reused = 0, failed = 0, skipped = 0) => ({ created, reused, failed, skipped });

function stepRow(label: string) {
	const row = screen.getByText(label).closest('li');
	if (!row) {
		throw new Error(`no step ${label}`);
	}
	return within(row);
}

describe('WorkspaceImportProgress', () => {
	it('shows each step with its counts and where it stands while the import runs', () => {
		const creation: WorkspaceCreationState = {
			status: 'creating',
			tallies: { clients: tally(2, 1), projects: tally(0), labels: tally(0) },
			failure: null
		};
		render(<WorkspaceImportProgress plan={PLAN} creation={creation} hasEntries onReset={jest.fn()} />);

		const clients = stepRow('timeImport.workspace.figures.CLIENTS');
		expect(clients.getByText('timeImport.workspace.STEP_COUNTS {"created":2,"reused":1,"failed":0}')).toBeTruthy();
		expect(clients.getByText('timeImport.workspace.status.done')).toBeTruthy();
		expect(
			stepRow('timeImport.workspace.figures.PROJECTS').getByText('timeImport.workspace.status.running')
		).toBeTruthy();
		expect(
			stepRow('timeImport.workspace.figures.LABELS').getByText('timeImport.workspace.status.waiting')
		).toBeTruthy();
		expect(screen.getByText('timeImport.KEEP_OPEN')).toBeTruthy();
		expect(screen.queryByRole('button')).toBeNull();
	});

	it('names what the import stopped on and why, and offers to start again', () => {
		const onReset = jest.fn();
		const creation: WorkspaceCreationState = {
			status: 'failed',
			tallies: { clients: tally(2, 1), projects: tally(0, 0, 1), labels: tally(0) },
			failure: { step: 'projects', name: 'Website', reasonKey: 'toasts.REASONS.PERMISSION' }
		};
		render(<WorkspaceImportProgress plan={PLAN} creation={creation} hasEntries onReset={onReset} />);

		expect(
			stepRow('timeImport.workspace.figures.PROJECTS').getByText('timeImport.workspace.status.failed')
		).toBeTruthy();
		expect(screen.getByText('timeImport.workspace.FAILED_TITLE {"name":"Website"}')).toBeTruthy();
		expect(
			screen.getByText('toasts.REASONS.PERMISSION timeImport.workspace.FAILED_DESCRIPTION', { exact: false })
		).toBeTruthy();
		fireEvent.click(screen.getByRole('button', { name: 'timeImport.workspace.CHOOSE_OTHER' }));

		expect(onReset).toHaveBeenCalled();
	});

	it('says the labels the role cannot add are not created', () => {
		const creation: WorkspaceCreationState = {
			status: 'created',
			tallies: { clients: tally(2, 1), projects: tally(1), labels: tally(0, 0, 0, 1) },
			failure: null
		};
		render(<WorkspaceImportProgress plan={PLAN} creation={creation} hasEntries onReset={jest.fn()} />);

		expect(
			stepRow('timeImport.workspace.figures.LABELS').getByText('timeImport.workspace.STEP_SKIPPED {"count":1}')
		).toBeTruthy();
	});

	it('ends with the lists in the workspace when the export had no entries', () => {
		const onReset = jest.fn();
		const creation: WorkspaceCreationState = {
			status: 'created',
			tallies: { clients: tally(2, 1), projects: tally(1), labels: tally(1) },
			failure: null
		};
		render(<WorkspaceImportProgress plan={PLAN} creation={creation} hasEntries={false} onReset={onReset} />);

		expect(screen.getByText('timeImport.workspace.CREATED_TITLE')).toBeTruthy();
		fireEvent.click(screen.getByRole('button', { name: 'timeImport.IMPORT_ANOTHER' }));

		expect(onReset).toHaveBeenCalled();
	});
});
