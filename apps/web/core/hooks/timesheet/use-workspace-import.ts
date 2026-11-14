'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { useClientsQuery } from '@/core/hooks/clients/use-clients-query';
import { useOrganizationProjectsQuery } from '@/core/hooks/organizations/projects/use-organization-projects-query';
import { useMyRolePermissionsQuery } from '@/core/hooks/roles/use-my-role-permissions-query';
import { useInvalidateTaskLabels } from '@/core/hooks/tasks/use-invalidate-task-labels';
import { useTaskLabelsQuery } from '@/core/hooks/tasks/use-task-labels-query';
import { type TimeImportAccess } from '@/core/hooks/timesheet/use-time-import-access';
import { useTimeImport } from '@/core/hooks/timesheet/use-time-import';
import { generateDefaultColor } from '@/core/lib/helpers/colors';
import { logErrorInDev } from '@/core/lib/helpers/error-message';
import { CLIENT_CONTACT_TYPE, CLIENT_CREATE_PERMISSIONS, holdsAnyPermission } from '@/core/lib/utils/clients';
import { errorReasonKeyOf } from '@/core/lib/utils/error-feedback';
import { isReadyRow, type TimeImportProject, type TimeImportRow } from '@/core/lib/utils/time-import-rows';
import type { TimeImportSheet } from '@/core/lib/utils/time-import-sheet';
import {
	CLIENT_HEADERS,
	TAG_HEADERS,
	columnIndexOf,
	csvTextOf,
	readWorkspaceFiles,
	type WorkspaceFiles,
	type WorkspacePickedFile,
	type WorkspaceTable
} from '@/core/lib/utils/workspace-import-files';
import {
	nameKeyOf,
	plannedProjectIdOf,
	tagNamesOf,
	workspaceImportPlanOf,
	type ExistingRecord,
	type PlannedProject,
	type WorkspaceEntryRow,
	type WorkspaceImportPlan
} from '@/core/lib/utils/workspace-import-plan';
import { runWorkspaceCreation, type WorkspaceStep, type WorkspaceTallies } from '@/core/lib/utils/workspace-import-run';
import { queryKeys } from '@/core/query/keys';
import { organizationContactService, organizationProjectService } from '@/core/services/client/api/organizations';
import { taskLabelService } from '@/core/services/client/api/tasks/task-label.service';
import { activeTeamState } from '@/core/stores/teams/organization-team';
import type { ITagCreate } from '@/core/types/interfaces/tag/tag';
import type { TCreateProjectRequest } from '@/core/types/schemas';

/** The permissions the API asks for to add a project, and to add a label; any one of each is enough. */
export const PROJECT_CREATE_PERMISSIONS = ['ALL_ORG_EDIT', 'ORG_PROJECT_ADD'] as const;
export const LABEL_CREATE_PERMISSIONS = ['ALL_ORG_EDIT', 'ORG_TAGS_ADD'] as const;
const CLIENT_VIEW_PERMISSIONS = ['ORG_CONTACT_VIEW'] as const;

const MEMBER_UNKNOWN = 'memberUnknown';

export type WorkspaceCreationStatus = 'idle' | 'creating' | 'created' | 'failed';

export interface WorkspaceCreationState {
	status: WorkspaceCreationStatus;
	tallies: WorkspaceTallies | null;
	failure: { step: WorkspaceStep; name: string; reasonKey: string } | null;
}

const NO_CREATION: WorkspaceCreationState = { status: 'idle', tallies: null, failure: null };

/** What the runs of this page created: in the workspace now, whether or not the lists read came back with it. */
interface CreatedRecords {
	clients: ExistingRecord[];
	projects: ExistingRecord[];
	labels: ExistingRecord[];
}

const NOTHING_CREATED: CreatedRecords = { clients: [], projects: [], labels: [] };

/** Whether the workspace's lists the plan compares with are all read, and whether one could not be read. */
export function existingListsStateOf(lists: ReadonlyArray<{ isLoaded: boolean; isError: boolean }>) {
	const areLoaded = lists.every((list) => list.isLoaded);
	const haveFailed = lists.some((list) => list.isError);
	return { areLoaded, haveFailed };
}

/**
 * A list read from the API with what an earlier run created and the list does not hold yet: its refresh is not
 * awaited, and a plan made before it comes back must not create the same records again.
 */
export function recordsWithCreated(
	read: ReadonlyArray<ExistingRecord>,
	created: ReadonlyArray<ExistingRecord>
): ReadonlyArray<ExistingRecord> {
	const readIds = new Set(read.map((record) => record.id));
	const missing = created.filter((record) => !readIds.has(record.id));
	if (missing.length === 0) {
		return read;
	}
	return [...read, ...missing];
}

/** Who may start a workspace import: the API refuses clients and projects to anyone else. */
export function workspaceImportRightsOf(permissions: ReadonlyArray<string>) {
	const canCreateClients = holdsAnyPermission(permissions, CLIENT_CREATE_PERMISSIONS);
	const canViewClients = holdsAnyPermission(permissions, CLIENT_VIEW_PERMISSIONS);
	const canCreateProjects = holdsAnyPermission(permissions, PROJECT_CREATE_PERMISSIONS);
	const canCreateLabels = holdsAnyPermission(permissions, LABEL_CREATE_PERMISSIONS);
	const canStart = canCreateClients && canViewClients && canCreateProjects;
	return { canStart, canCreateLabels };
}

/** The entries file's rows, by their line in the CSV the time import reads (the header is line 1). */
function recordsByRowOf(entries: WorkspaceTable | null) {
	const byRow = new Map<number, ReadonlyArray<string>>();
	entries?.table.records.forEach((record, index) => byRow.set(index + 2, record.cells));
	return byRow;
}

function cellAt(cells: ReadonlyArray<string> | undefined, index: number | null): string {
	if (!cells || index === null) {
		return '';
	}
	return cells[index]?.trim() ?? '';
}

function readyEmployeeIdOf(row: TimeImportRow): string | null {
	if (isReadyRow(row)) {
		return row.entry.employeeId;
	}
	return null;
}

/** The rows the time import judged, with the client and labels cells only the workspace import reads. */
export function workspaceEntryRowsOf(
	rows: ReadonlyArray<TimeImportRow>,
	entries: WorkspaceTable | null
): WorkspaceEntryRow[] {
	const headers = entries?.table.headers ?? [];
	const clientIndex = columnIndexOf(headers, CLIENT_HEADERS);
	const tagsIndex = columnIndexOf(headers, TAG_HEADERS);
	const cellsByRow = recordsByRowOf(entries);
	return rows.map((row) => {
		const cells = cellsByRow.get(row.row);
		return {
			row: row.row,
			projectName: row.cells.project,
			clientName: cellAt(cells, clientIndex),
			tagNames: tagNamesOf(cellAt(cells, tagsIndex)),
			memberEmail: row.cells.memberEmail,
			readyEmployeeId: readyEmployeeIdOf(row),
			isMemberUnknown: row.problems.some((problem) => problem.code === MEMBER_UNKNOWN)
		};
	});
}

/**
 * Projects a file names that the team does not have: the organization's own when one has the name, else a project
 * still to create under its stand-in id (until `known` holds the created one).
 */
export function extraProjectsOfSheet(
	sheet: TimeImportSheet,
	teamProjects: ReadonlyArray<TimeImportProject>,
	known: ReadonlyArray<ExistingRecord>
): TimeImportProject[] {
	const teamKeys = new Set(teamProjects.map((project) => nameKeyOf(project.name)));
	const knownByKey = new Map(known.map((project) => [nameKeyOf(project.name), project]));
	const seen = new Set<string>();
	const extra: TimeImportProject[] = [];
	for (const row of sheet.rows) {
		const name = row.cells.project.trim();
		const key = nameKeyOf(name);
		const isNew = key !== '' && !teamKeys.has(key) && !seen.has(key);
		if (!isNew) {
			continue;
		}
		seen.add(key);
		const found = knownByKey.get(key);
		if (found) {
			extra.push({ id: found.id, name: found.name });
			continue;
		}
		extra.push({ id: plannedProjectIdOf(name), name });
	}
	return extra;
}

function pickedFileOfCsv(fileName: string, text: string): WorkspacePickedFile {
	const bytes = new TextEncoder().encode(text);
	const name = `${fileName.replace(/\.[^.]+$/u, '')}.csv`;
	return { name, size: bytes.byteLength, arrayBuffer: async () => bytes.buffer as ArrayBuffer };
}

/** A label of the team, in the color the app gives that name: the API refuses a label without a color. */
export function labelRequestOf(name: string, scope: TimeImportAccess['saveScope']): ITagCreate {
	return {
		name,
		color: generateDefaultColor(name),
		organizationId: scope.organizationId ?? '',
		tenantId: scope.tenantId,
		organizationTeamId: scope.organizationTeamId
	};
}

/** A project to create, filed with the active team, with only the settings the file gives. */
function projectRequestOf(
	project: PlannedProject,
	clientId: string | null,
	scope: TimeImportAccess['saveScope'],
	activeTeam: NonNullable<TCreateProjectRequest['teams']>[number] | null
): Partial<TCreateProjectRequest> {
	const request: Partial<TCreateProjectRequest> = {
		name: project.name,
		tenantId: scope.tenantId,
		teams: []
	};
	if (scope.organizationId) {
		request.organizationId = scope.organizationId;
	}
	if (activeTeam) {
		request.teams = [activeTeam];
	}
	if (project.color) {
		request.color = project.color;
	}
	if (project.billable !== null) {
		request.billable = project.billable;
	}
	if (clientId) {
		request.organizationContactId = clientId;
	}
	return request;
}

/**
 * The import of another tool's workspace export: the files are read (CSV, JSON or ZIP), the entries go through the
 * time import's own columns step and checks, and nothing is saved before `confirm`, which creates the clients, the
 * projects and the labels in that order, then lets the time import save the entries against the real projects.
 */
export function useWorkspaceImport(access: TimeImportAccess) {
	const queryClient = useQueryClient();
	const activeTeam = useAtomValue(activeTeamState);
	const { myPermissions } = useMyRolePermissionsQuery();
	const rights = useMemo(() => workspaceImportRightsOf(myPermissions), [myPermissions]);
	const clientsQuery = useClientsQuery({ enabled: rights.canStart });
	const { organizationProjects, isOrganizationProjectsLoaded, isOrganizationProjectsError } =
		useOrganizationProjectsQuery({ enabled: rights.canStart });
	const labelsQuery = useTaskLabelsQuery();
	const { invalidateTaskLabelsData } = useInvalidateTaskLabels();

	const [files, setFiles] = useState<WorkspaceFiles | null>(null);
	const [isReading, setIsReading] = useState(false);
	const [created, setCreated] = useState<CreatedRecords>(NOTHING_CREATED);
	const [creation, setCreation] = useState<WorkspaceCreationState>(NO_CREATION);
	// The plan a creation started from: the live one follows the workspace as the created records load back
	const [creationPlan, setCreationPlan] = useState<WorkspaceImportPlan | null>(null);
	const [creationSavesEntries, setCreationSavesEntries] = useState(false);
	const [shouldSaveEntries, setShouldSaveEntries] = useState(false);
	// Counts the files and the runs started: an older one that answers late changes nothing
	const runRef = useRef(0);

	useEffect(() => {
		return () => {
			runRef.current += 1;
		};
	}, []);

	const existingClients = useMemo(
		() => recordsWithCreated(clientsQuery.activeClients, created.clients),
		[clientsQuery.activeClients, created.clients]
	);
	const existingProjects = useMemo(() => {
		const read = organizationProjects.map((project) => ({ id: project.id, name: project.name ?? '' }));
		return recordsWithCreated(read, created.projects);
	}, [created.projects, organizationProjects]);
	const { taskLabels } = labelsQuery;
	const existingLabels = useMemo(() => {
		const read = taskLabels.map((label) => ({ id: label.id, name: label.name ?? '' }));
		return recordsWithCreated(read, created.labels);
	}, [created.labels, taskLabels]);
	const extraProjectsOf = useCallback(
		(sheet: TimeImportSheet, context: { projects: ReadonlyArray<TimeImportProject> }) =>
			extraProjectsOfSheet(sheet, context.projects, existingProjects),
		[existingProjects]
	);
	const timeImport = useTimeImport({ contextAt: access.contextAt, saveScope: access.saveScope, extraProjectsOf });
	const { contextAt } = access;
	const members = useMemo(
		() => contextAt(new Date()).members.map((member) => ({ employeeId: member.employeeId, name: member.name })),
		[contextAt]
	);

	const hasEntries = files?.entries !== null && files?.entries !== undefined;
	const savesEntries = hasEntries && timeImport.summary.readyCount > 0;
	const isEntriesJudged = timeImport.stage === 'preview' || timeImport.stage === 'done';
	const existingLists = existingListsStateOf([
		{ isLoaded: clientsQuery.isLoaded, isError: clientsQuery.isError },
		{ isLoaded: isOrganizationProjectsLoaded, isError: isOrganizationProjectsError },
		{ isLoaded: !labelsQuery.loading, isError: labelsQuery.isError }
	]);
	const areExistingLoaded = existingLists.areLoaded;
	const hasExistingFailed = existingLists.haveFailed;
	const canPlan = files !== null && areExistingLoaded && (!hasEntries || isEntriesJudged);

	const plan = useMemo<WorkspaceImportPlan | null>(() => {
		if (!canPlan || !files) {
			return null;
		}
		return workspaceImportPlanOf({
			clientsFile: files.clients,
			projectsFile: files.projects,
			tagsFile: files.tags,
			entryRows: workspaceEntryRowsOf(timeImport.rows, files.entries),
			existing: { clients: existingClients, projects: existingProjects, labels: existingLabels },
			members
		});
	}, [canPlan, existingClients, existingLabels, existingProjects, files, members, timeImport.rows]);

	const chooseFiles = useCallback(
		async (picked: ReadonlyArray<WorkspacePickedFile>) => {
			runRef.current += 1;
			const run = runRef.current;
			timeImport.reset();
			setCreation(NO_CREATION);
			setCreationPlan(null);
			setCreationSavesEntries(false);
			setIsReading(true);
			let read: WorkspaceFiles;
			try {
				read = await readWorkspaceFiles(picked);
			} finally {
				// Whatever the reading gave, the page leaves its reading screen; a newer reading keeps its own
				if (runRef.current === run) {
					setIsReading(false);
				}
			}
			if (runRef.current !== run) {
				return;
			}
			setFiles(read);
			if (read.entries) {
				const csv = pickedFileOfCsv(read.entries.fileName, csvTextOf(read.entries.table));
				await timeImport.chooseFile(csv);
			}
		},
		[timeImport]
	);

	const reset = useCallback(() => {
		runRef.current += 1;
		timeImport.reset();
		setFiles(null);
		setIsReading(false);
		setCreation(NO_CREATION);
		setCreationPlan(null);
		setCreationSavesEntries(false);
		setShouldSaveEntries(false);
	}, [timeImport]);

	const { saveScope } = access;
	const createProject = useCallback(
		async (project: PlannedProject, clientId: string | null) => {
			const request = projectRequestOf(project, clientId, saveScope, activeTeam);
			const created = await organizationProjectService.createOrganizationProject(request);
			return { id: created.id, name: project.name };
		},
		[activeTeam, saveScope]
	);

	const confirm = useCallback(async () => {
		if (!plan || creation.status === 'creating') {
			return;
		}
		runRef.current += 1;
		const run = runRef.current;
		const isRunGoing = () => runRef.current === run;
		setCreationPlan(plan);
		setCreationSavesEntries(savesEntries);
		setCreation({ status: 'creating', tallies: null, failure: null });
		const organizationId = saveScope.organizationId ?? '';
		const createdNow: CreatedRecords = { clients: [], projects: [], labels: [] };
		const result = await runWorkspaceCreation(plan, {
			createClient: async (name) => {
				const client = await organizationContactService.createClient({
					name,
					primaryEmail: null,
					primaryPhone: null,
					notes: null,
					contactType: CLIENT_CONTACT_TYPE,
					organizationId,
					tenantId: saveScope.tenantId
				});
				const record = { id: client.id, name: client.name };
				createdNow.clients.push(record);
				return record;
			},
			createProject: async (project, clientId) => {
				const record = await createProject(project, clientId);
				createdNow.projects.push(record);
				return record;
			},
			createLabel: async (name) => {
				const response = await taskLabelService.createTaskLabels(labelRequestOf(name, saveScope));
				const record = { id: response.data.id, name };
				createdNow.labels.push(record);
				return record;
			},
			canCreateLabels: rights.canCreateLabels,
			isRunGoing,
			onProgress: (tallies) => {
				if (isRunGoing()) {
					setCreation({ status: 'creating', tallies, failure: null });
				}
			}
		});
		setCreated((current) => ({
			clients: [...current.clients, ...createdNow.clients],
			projects: [...current.projects, ...createdNow.projects],
			labels: [...current.labels, ...createdNow.labels]
		}));
		void queryClient.invalidateQueries({ queryKey: queryKeys.clients.all });
		void queryClient.invalidateQueries({ queryKey: queryKeys.organizationProjects.all });
		void queryClient.invalidateQueries({ queryKey: queryKeys.organizationTeams.all });
		invalidateTaskLabelsData();
		// A run cut short (the files changed, or the page was left) has no screen left to report to
		if (!isRunGoing()) {
			return;
		}
		if (result.failure) {
			logErrorInDev('Workspace import step refused', result.failure.error);
			const { step, name, error } = result.failure;
			const failure = { step, name, reasonKey: errorReasonKeyOf(error) };
			setCreation({ status: 'failed', tallies: result.tallies, failure });
			return;
		}
		setCreation({ status: 'created', tallies: result.tallies, failure: null });
		setShouldSaveEntries(savesEntries);
	}, [
		createProject,
		creation.status,
		invalidateTaskLabelsData,
		plan,
		queryClient,
		rights.canCreateLabels,
		savesEntries,
		saveScope.organizationId,
		saveScope.organizationTeamId,
		saveScope.tenantId
	]);

	// The entries are saved on the render after the projects exist, so that their check reads the real projects
	const { stage: timeImportStage, confirm: confirmEntries } = timeImport;
	useEffect(() => {
		if (!shouldSaveEntries || timeImportStage !== 'preview') {
			return;
		}
		setShouldSaveEntries(false);
		void confirmEntries();
	}, [confirmEntries, shouldSaveEntries, timeImportStage]);

	return {
		rights,
		files,
		isReading,
		hasEntries,
		/** Whether the creation under way saves entries once the lists exist: some were ready when it started. */
		creationSavesEntries,
		isLoadingExisting: rights.canStart && !areExistingLoaded && !hasExistingFailed,
		hasExistingFailed,
		retryExisting: () => {
			void clientsQuery.refetch();
			void labelsQuery.refetch();
			void queryClient.invalidateQueries({ queryKey: queryKeys.organizationProjects.all });
		},
		plan,
		creationPlan,
		creation,
		timeImport: { ...timeImport, confirm, reset },
		chooseFiles,
		confirm,
		reset
	};
}

export type WorkspaceImport = ReturnType<typeof useWorkspaceImport>;
