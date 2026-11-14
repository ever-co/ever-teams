import {
	BILLABLE_HEADERS,
	CLIENT_HEADERS,
	COLOR_HEADERS,
	NAME_HEADERS,
	TAG_HEADERS,
	columnIndexOf,
	type WorkspaceTable
} from './workspace-import-files';

/** A client, project or label the workspace already has. */
export interface ExistingRecord {
	id: string;
	name: string;
}

export interface PlannedProject {
	name: string;
	clientName: string | null;
	/** `#RRGGBB`, or null when the file gives none or one the API would refuse. */
	color: string | null;
	/** The project's billable default, or null when the file does not say. */
	billable: boolean | null;
}

/** One row of the entries file, as the time import read it, with the cells only the workspace import reads. */
export interface WorkspaceEntryRow {
	row: number;
	projectName: string;
	clientName: string;
	tagNames: ReadonlyArray<string>;
	memberEmail: string;
	/** The row's billable cell as the time import reads it (yes or no), or null when it does not say. */
	billable: boolean | null;
	/** The member the row is filed under when the time import accepts it, else null. */
	readyEmployeeId: string | null;
	isMemberUnknown: boolean;
}

export interface WorkspaceMember {
	employeeId: string;
	name: string;
}

export interface WorkspaceImportPlan {
	clients: { create: string[]; reuse: ExistingRecord[] };
	projects: { create: PlannedProject[]; reuse: ExistingRecord[] };
	labels: { create: string[]; reuse: ExistingRecord[] };
	entriesByMember: Array<{ employeeId: string; name: string; count: number }>;
	/** Emails no member of the team has: their rows are left out and never filed under someone else. */
	unknownEmails: Array<{ email: string; rows: number[] }>;
	/** Rows that carry labels: entries have no labels, so the labels are created but not attached. */
	taggedEntryCount: number;
}

export interface WorkspacePlanInput {
	clientsFile: WorkspaceTable | null;
	projectsFile: WorkspaceTable | null;
	tagsFile: WorkspaceTable | null;
	entryRows: ReadonlyArray<WorkspaceEntryRow>;
	existing: {
		clients: ReadonlyArray<ExistingRecord>;
		projects: ReadonlyArray<ExistingRecord>;
		labels: ReadonlyArray<ExistingRecord>;
	};
	members: ReadonlyArray<WorkspaceMember>;
}

const PLANNED_PROJECT_PREFIX = 'planned:';

const TRUE_WORDS = ['yes', 'true', '1', 'billable', 'y'];
const FALSE_WORDS = ['no', 'false', '0', 'non billable', 'not billable', 'n'];

/** How two names are compared: letter case, outer spaces and repeated spaces aside. */
export function nameKeyOf(name: string): string {
	return name.normalize('NFC').trim().replace(/\s+/gu, ' ').toLowerCase();
}

/** The id a project the import will create stands under until it exists. */
export function plannedProjectIdOf(name: string): string {
	return `${PLANNED_PROJECT_PREFIX}${nameKeyOf(name)}`;
}

export function isPlannedProjectId(id: string): boolean {
	return id.startsWith(PLANNED_PROJECT_PREFIX);
}

/** Splits a labels cell: commas or semicolons between the names. */
export function tagNamesOf(cell: string): string[] {
	return cell
		.split(/[,;]/u)
		.map((name) => name.trim())
		.filter((name) => name !== '');
}

export function billableOf(cell: string): boolean | null {
	const words = nameKeyOf(cell);
	if (TRUE_WORDS.includes(words)) {
		return true;
	}
	if (FALSE_WORDS.includes(words)) {
		return false;
	}
	return null;
}

export function colorOf(cell: string): string | null {
	const match = /^#?([0-9a-f]{6})$/iu.exec(cell.trim());
	if (!match) {
		return null;
	}
	return `#${match[1].toUpperCase()}`;
}

/** Names in their first spelling, each name once. */
class NameSet {
	private readonly byKey = new Map<string, string>();

	add(name: string) {
		const trimmed = name.trim();
		const key = nameKeyOf(trimmed);
		if (key !== '' && !this.byKey.has(key)) {
			this.byKey.set(key, trimmed);
		}
	}

	names(): string[] {
		return [...this.byKey.values()];
	}
}

function cellAt(cells: ReadonlyArray<string>, index: number | null): string {
	if (index === null) {
		return '';
	}
	return cells[index]?.trim() ?? '';
}

/** The names a list file holds: its name column, else its only column. */
function namesOfList(file: WorkspaceTable | null, candidates: ReadonlyArray<string>): string[] {
	if (!file) {
		return [];
	}
	const { headers, records } = file.table;
	let index = columnIndexOf(headers, [...NAME_HEADERS, ...candidates]);
	const hasSingleColumn = headers.length === 1;
	if (index === null && hasSingleColumn) {
		index = 0;
	}
	return records.map((record) => cellAt(record.cells, index)).filter((name) => name !== '');
}

function projectsOfFile(file: WorkspaceTable | null): PlannedProject[] {
	if (!file) {
		return [];
	}
	const { headers, records } = file.table;
	const nameIndex = columnIndexOf(headers, [...NAME_HEADERS, 'project', 'project name']);
	const clientIndex = columnIndexOf(headers, CLIENT_HEADERS);
	const colorIndex = columnIndexOf(headers, COLOR_HEADERS);
	const billableIndex = columnIndexOf(headers, BILLABLE_HEADERS);
	return records
		.map((record) => ({
			name: cellAt(record.cells, nameIndex),
			clientName: cellAt(record.cells, clientIndex) || null,
			color: colorOf(cellAt(record.cells, colorIndex)),
			billable: billableOf(cellAt(record.cells, billableIndex))
		}))
		.filter((project) => project.name !== '');
}

function splitByExisting(names: ReadonlyArray<string>, existing: ReadonlyArray<ExistingRecord>) {
	const byKey = new Map(existing.map((record) => [nameKeyOf(record.name), record]));
	const create: string[] = [];
	const reuse: ExistingRecord[] = [];
	for (const name of names) {
		const found = byKey.get(nameKeyOf(name));
		if (found) {
			reuse.push(found);
			continue;
		}
		create.push(name);
	}
	return { create, reuse };
}

/** The projects of the file, then those only entries name, each with the first client and settings given for it. */
function plannedProjectsOf(input: WorkspacePlanInput): PlannedProject[] {
	const byKey = new Map<string, PlannedProject>();
	for (const project of projectsOfFile(input.projectsFile)) {
		const key = nameKeyOf(project.name);
		if (!byKey.has(key)) {
			byKey.set(key, project);
		}
	}
	const entryBillables = new Map<string, Set<boolean>>();
	for (const row of input.entryRows) {
		const key = nameKeyOf(row.projectName);
		if (key === '') {
			continue;
		}
		if (row.billable !== null) {
			const billables = entryBillables.get(key) ?? new Set<boolean>();
			billables.add(row.billable);
			entryBillables.set(key, billables);
		}
		const known = byKey.get(key);
		const clientName = row.clientName || null;
		if (!known) {
			byKey.set(key, { name: row.projectName.trim(), clientName, color: null, billable: null });
			continue;
		}
		if (!known.clientName && clientName) {
			byKey.set(key, { ...known, clientName });
		}
	}
	// A project the projects file gives no billable default takes the one its entries agree on: none when they
	// differ, or when none of them says
	return [...byKey.entries()].map(([key, project]) => {
		const billables = entryBillables.get(key);
		const isAgreed = project.billable === null && billables?.size === 1;
		if (!isAgreed) {
			return project;
		}
		return { ...project, billable: [...billables][0] };
	});
}

function entriesByMemberOf(input: WorkspacePlanInput) {
	const counts = new Map<string, number>();
	for (const row of input.entryRows) {
		if (row.readyEmployeeId) {
			counts.set(row.readyEmployeeId, (counts.get(row.readyEmployeeId) ?? 0) + 1);
		}
	}
	const names = new Map(input.members.map((member) => [member.employeeId, member.name]));
	return [...counts.entries()].map(([employeeId, count]) => ({
		employeeId,
		name: names.get(employeeId) ?? '',
		count
	}));
}

function unknownEmailsOf(rows: ReadonlyArray<WorkspaceEntryRow>) {
	const byEmail = new Map<string, { email: string; rows: number[] }>();
	for (const row of rows) {
		if (!row.isMemberUnknown) {
			continue;
		}
		const key = nameKeyOf(row.memberEmail);
		const current = byEmail.get(key) ?? { email: row.memberEmail.trim(), rows: [] };
		current.rows.push(row.row);
		byEmail.set(key, current);
	}
	return [...byEmail.values()];
}

/**
 * What a workspace import creates and what it reuses, before anything is saved: clients, then projects with their
 * client, colour and billable default, then labels, each matched with what the workspace has by name, letter case
 * aside. Entries are counted per member; the rows of an email no member has are listed apart.
 */
export function workspaceImportPlanOf(input: WorkspacePlanInput): WorkspaceImportPlan {
	const projects = plannedProjectsOf(input);
	const clientNames = new NameSet();
	namesOfList(input.clientsFile, CLIENT_HEADERS).forEach((name) => clientNames.add(name));
	for (const project of projects) {
		clientNames.add(project.clientName ?? '');
	}
	input.entryRows.forEach((row) => clientNames.add(row.clientName));

	const labelNames = new NameSet();
	namesOfList(input.tagsFile, TAG_HEADERS).forEach((name) => labelNames.add(name));
	input.entryRows.forEach((row) => row.tagNames.forEach((name) => labelNames.add(name)));

	const existingProjects = new Map(input.existing.projects.map((project) => [nameKeyOf(project.name), project]));
	const projectsToCreate = projects.filter((project) => !existingProjects.has(nameKeyOf(project.name)));
	const projectsToReuse = projects
		.map((project) => existingProjects.get(nameKeyOf(project.name)))
		.filter((project): project is ExistingRecord => project !== undefined);

	return {
		clients: splitByExisting(clientNames.names(), input.existing.clients),
		projects: { create: projectsToCreate, reuse: projectsToReuse },
		labels: splitByExisting(labelNames.names(), input.existing.labels),
		entriesByMember: entriesByMemberOf(input),
		unknownEmails: unknownEmailsOf(input.entryRows),
		taggedEntryCount: input.entryRows.filter((row) => row.tagNames.length > 0).length
	};
}

export function hasAnythingToCreate(plan: WorkspaceImportPlan): boolean {
	const createsClients = plan.clients.create.length > 0;
	const createsProjects = plan.projects.create.length > 0;
	const createsLabels = plan.labels.create.length > 0;
	return createsClients || createsProjects || createsLabels;
}
