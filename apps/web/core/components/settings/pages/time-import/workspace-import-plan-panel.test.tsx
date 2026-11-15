/** @jest-environment jsdom */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { WorkspaceImportPlan } from '@/core/lib/utils/workspace-import-plan';

type MockMetric = { key: string; label: string; value: React.ReactNode; hint?: React.ReactNode };

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
	Briefcase: () => null,
	Building: () => null,
	Tag: () => null,
	Users: () => null
}));
jest.mock('@/core/components/common/notice', () => ({
	Notice: ({ title, description }: { title: React.ReactNode; description?: React.ReactNode }) => (
		<output>
			<p>{title}</p>
			<div>{description}</div>
		</output>
	)
}));
jest.mock('@/core/components/dashboards/kit/metric-strip', () => ({
	MetricStrip: ({ items }: { items: MockMetric[] }) => (
		<dl>
			{items.map((item) => (
				<div key={item.key} data-testid={`figure-${item.key}`}>
					{item.label}: {item.value} ({item.hint})
				</div>
			))}
		</dl>
	)
}));

import { WorkspaceImportPlanPanel } from './workspace-import-plan-panel';

const PLAN: WorkspaceImportPlan = {
	clients: { create: ['Acme', 'Globex'], reuse: [{ id: 'client-initech', name: 'Initech' }] },
	projects: {
		create: [
			{ name: 'Website', clientName: 'Acme', color: '#3366FF', billable: true },
			{ name: 'Internal', clientName: null, color: null, billable: null }
		],
		reuse: [{ id: 'project-audit', name: 'Audit' }]
	},
	labels: { create: ['Design'], reuse: [] },
	entriesByMember: [
		{ employeeId: 'emp-marie', name: 'Marie Curie', count: 120 },
		{ employeeId: 'emp-amina', name: 'Amina Diallo', count: 80 }
	],
	unknownEmails: [{ email: 'ghost@studio.io', rows: [7, 9] }],
	taggedEntryCount: 12
};

const NOTHING_TO_CREATE: WorkspaceImportPlan = {
	...PLAN,
	clients: { create: [], reuse: PLAN.clients.reuse },
	projects: { create: [], reuse: PLAN.projects.reuse },
	labels: { create: [], reuse: [] },
	entriesByMember: [],
	unknownEmails: [],
	taggedEntryCount: 0
};

function renderPanel(patch: Partial<React.ComponentProps<typeof WorkspaceImportPlanPanel>> = {}) {
	const onImportLists = jest.fn();
	render(
		<WorkspaceImportPlanPanel
			plan={PLAN}
			canCreateLabels
			readyEntryCount={200}
			onImportLists={onImportLists}
			{...patch}
		/>
	);
	return { onImportLists };
}

describe('WorkspaceImportPlanPanel', () => {
	it('counts the clients, projects and labels, new and reused', () => {
		renderPanel();

		expect(screen.getByTestId('figure-clients').textContent).toBe(
			'timeImport.workspace.figures.CLIENTS: 3 (timeImport.workspace.NEW_AND_REUSED {"created":2,"reused":1})'
		);
		expect(screen.getByTestId('figure-projects').textContent).toContain('{"created":2,"reused":1}');
		expect(screen.getByTestId('figure-labels').textContent).toContain('{"created":1,"reused":0}');
	});

	it('names what is created and what is reused, with each new project client and billable default', () => {
		renderPanel();

		// Once as a client to create, once as the client of the new project Website
		expect(screen.getAllByText('Acme')).toHaveLength(2);
		expect(screen.getByText('Initech')).toBeTruthy();
		expect(screen.getByText('Website')).toBeTruthy();
		expect(screen.getByText('timeImport.workspace.BILLABLE')).toBeTruthy();
		expect(screen.getByText('timeImport.workspace.NO_CLIENT')).toBeTruthy();
		expect(screen.getByText('Audit')).toBeTruthy();
		expect(screen.getByText('Design')).toBeTruthy();
	});

	it('counts the entries of each member and lists apart the emails no member has', () => {
		renderPanel();

		expect(screen.getByText('Marie Curie')).toBeTruthy();
		expect(screen.getByText('timeImport.workspace.MEMBER_ENTRIES {"count":120}')).toBeTruthy();
		expect(screen.getByText('timeImport.workspace.UNKNOWN_EMAILS_TITLE {"count":1}')).toBeTruthy();
		expect(screen.getByText('ghost@studio.io')).toBeTruthy();
	});

	it('says the labels are not attached to entries, and not created at all when the role cannot add them', () => {
		renderPanel({ canCreateLabels: false });

		expect(screen.getByText('timeImport.workspace.TAGGED_ENTRIES_NOTE {"count":12}')).toBeTruthy();
		expect(screen.getByText('timeImport.workspace.LABELS_SKIPPED_NOTE')).toBeTruthy();
	});

	it('leaves the import to the entries below when some are ready', () => {
		renderPanel();

		expect(screen.getByRole('heading', { name: 'timeImport.workspace.PLAN_TITLE' })).toBeTruthy();
		expect(screen.queryByRole('button', { name: 'timeImport.workspace.IMPORT_LISTS_ACTION' })).toBeNull();
	});

	it('imports the lists alone when no entry is ready', () => {
		const { onImportLists } = renderPanel({ readyEntryCount: 0 });

		fireEvent.click(screen.getByRole('button', { name: 'timeImport.workspace.IMPORT_LISTS_ACTION' }));

		expect(onImportLists).toHaveBeenCalled();
	});

	it('says there is nothing to do when everything exists and no entry is ready', () => {
		renderPanel({ plan: NOTHING_TO_CREATE, readyEntryCount: 0 });

		expect(screen.getByText('timeImport.workspace.NOTHING_TO_DO')).toBeTruthy();
		expect(screen.queryByRole('button', { name: 'timeImport.workspace.IMPORT_LISTS_ACTION' })).toBeNull();
	});
});
