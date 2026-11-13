import { addDays, differenceInDays, isAfter, isEqual } from 'date-fns';
import type { DottedLanguageObjectStringPaths } from 'next-intl';
import { isValidUrl } from '@/core/lib/utils/is-valid-url';
import { clientIdOf, personFromProjectMember, realDateOf, type ProjectPerson } from '@/core/lib/utils/project-list';
import { EProjectBilling, EProjectBudgetType } from '@/core/types/generics/enums/project';
import { ETaskStatusName } from '@/core/types/generics/enums/task';
import type { TCreateProjectRequest, TOrganizationProject, TTag } from '@/core/types/schemas';
import type { TOrganizationTeam } from '@/core/types/schemas/team/organization-team.schema';

const PROJECT_NAME_MIN_LENGTH = 3;
export const PROJECT_NAME_MAX_LENGTH = 100;
const PROJECT_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const PROJECT_IMAGE_TYPES = ['image/jpeg', 'image/png'];
const DEFAULT_PROJECT_LENGTH_DAYS = 7;

/** The statuses of Gauzy's `ProjectStatusEnum` that the request schema also accepts. */
export const PROJECT_STATUS_VALUES: ETaskStatusName[] = [
	ETaskStatusName.OPEN,
	ETaskStatusName.IN_PROGRESS,
	ETaskStatusName.COMPLETED,
	ETaskStatusName.CANCELLED
];

export const PROJECT_STATUS_LABEL_KEYS: Record<string, DottedLanguageObjectStringPaths> = {
	[ETaskStatusName.OPEN]: 'pages.projects.modals.status.open',
	[ETaskStatusName.IN_PROGRESS]: 'pages.projects.modals.status.inProgress',
	[ETaskStatusName.COMPLETED]: 'pages.projects.modals.status.completed',
	[ETaskStatusName.CANCELLED]: 'pages.projects.modals.status.cancelled'
};

export const PROJECT_BUDGET_TYPE_LABEL_KEYS: Record<EProjectBudgetType, DottedLanguageObjectStringPaths> = {
	[EProjectBudgetType.HOURS]: 'pages.projects.modals.budget.hours',
	[EProjectBudgetType.COST]: 'pages.projects.modals.budget.cost'
};

export const PROJECT_BILLING_LABEL_KEYS: Record<EProjectBilling, DottedLanguageObjectStringPaths> = {
	[EProjectBilling.RATE]: 'common.RATE',
	[EProjectBilling.FLAT_FEE]: 'common.FLAT_FEE',
	[EProjectBilling.MILESTONES]: 'common.MILESTONES'
};

export const PROJECT_COLOR_SWATCHES = [
	'#6366f1',
	'#0ea5e9',
	'#14b8a6',
	'#22c55e',
	'#eab308',
	'#f97316',
	'#ef4444',
	'#ec4899',
	'#a855f7',
	'#64748b'
];

export interface ProjectDraft {
	name: string;
	description: string;
	status: string | null;
	startDate: Date | null;
	endDate: Date | null;
	projectUrl: string;
	/** The key the project's tasks are numbered with (`WEB-42`); empty: the platform proposes one on create. */
	taskKey: string;
	color: string | null;
	imageUrl: string | null;
	imageId: string | null;
	teamIds: string[];
	managerIds: string[];
	memberIds: string[];
	tagIds: string[];
	budgetType: EProjectBudgetType;
	budget: number | null;
	currency: string | null;
	billing: EProjectBilling;
	clientId: string | null;
}

export type ProjectDraftErrorKey = 'name' | 'dates' | 'projectUrl' | 'taskKey' | 'description' | 'teams' | 'image';

/** A project's task key: 2 to 10 upper-case letters or digits, starting with a letter (the platform's own rule). */
const TASK_KEY_PATTERN = /^[A-Z][A-Z0-9]{1,9}$/;

/** The key the platform proposes for a name: its first three letters or digits, else its first three letters. */
export function proposedTaskKey(name: string): string {
	const compact = name.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 3);
	if (TASK_KEY_PATTERN.test(compact)) return compact;
	const letters = name.replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 3);
	return letters.length >= 2 ? letters : '';
}

export type ProjectDraftErrors = Partial<Record<ProjectDraftErrorKey, DottedLanguageObjectStringPaths>>;

export type ProjectMemberRole = 'manager' | 'member';

export interface ProjectImageAsset {
	id?: string | null;
	fullUrl?: string | null;
}

function idsOf(items: { id?: string | null }[] | null | undefined) {
	const ids: string[] = [];
	for (const item of items ?? []) {
		if (item?.id) {
			ids.push(item.id);
		}
	}
	return ids;
}

function employeeIdsOf(members: TOrganizationProject['members'], wantsManagers: boolean) {
	const ids: string[] = [];
	for (const member of members ?? []) {
		const isWantedRole = Boolean(member?.isManager) === wantsManagers;
		const employeeId = member?.employeeId;
		if (isWantedRole && employeeId) {
			ids.push(employeeId);
		}
	}
	return ids;
}

function withActiveTeam(teamIds: string[], activeTeamId: string | null | undefined) {
	if (!activeTeamId) {
		return teamIds;
	}
	const hasActiveTeam = teamIds.includes(activeTeamId);
	if (hasActiveTeam) {
		return teamIds;
	}
	return [...teamIds, activeTeamId];
}

export function emptyProjectDraft(activeTeamId: string | null | undefined, today = new Date()): ProjectDraft {
	const teamIds = withActiveTeam([], activeTeamId);
	return {
		name: '',
		description: '',
		status: ETaskStatusName.OPEN,
		startDate: today,
		endDate: addDays(today, DEFAULT_PROJECT_LENGTH_DAYS),
		projectUrl: '',
		taskKey: '',
		color: null,
		imageUrl: null,
		imageId: null,
		teamIds,
		managerIds: [],
		memberIds: [],
		tagIds: [],
		budgetType: EProjectBudgetType.HOURS,
		budget: null,
		currency: null,
		billing: EProjectBilling.FLAT_FEE,
		clientId: null
	};
}

/**
 * A new project's draft as the form shows and saves it: in the workspace's currency until the person picks one. The
 * workspace may be read after the form opened, so its currency is not written into the draft the person fills.
 */
export function draftInWorkspaceCurrency(draft: ProjectDraft, workspaceCurrency: string | null): ProjectDraft {
	const hasPickedCurrency = Boolean(draft.currency);
	const hasNothingToOffer = !workspaceCurrency;
	if (hasPickedCurrency || hasNothingToOffer) {
		return draft;
	}
	return { ...draft, currency: workspaceCurrency };
}

function budgetOf(budget: number | null | undefined) {
	const hasBudget = typeof budget === 'number' && budget > 0;
	if (!hasBudget) {
		return null;
	}
	return budget;
}

export function draftFromProject(project: TOrganizationProject, activeTeamId: string | null | undefined): ProjectDraft {
	const projectTeamIds = idsOf(project.teams);
	return {
		name: project.name ?? '',
		description: project.description ?? '',
		status: project.status ?? null,
		startDate: realDateOf(project.startDate),
		endDate: realDateOf(project.endDate),
		projectUrl: project.projectUrl ?? '',
		taskKey: String((project as { taskKey?: string | null }).taskKey ?? ''),
		color: project.color ?? null,
		imageUrl: project.imageUrl ?? null,
		imageId: project.imageId ?? null,
		teamIds: withActiveTeam(projectTeamIds, activeTeamId),
		managerIds: employeeIdsOf(project.members, true),
		memberIds: employeeIdsOf(project.members, false),
		tagIds: idsOf(project.tags),
		budgetType: project.budgetType ?? EProjectBudgetType.HOURS,
		budget: budgetOf(project.budget),
		currency: project.currency ?? null,
		billing: project.billing ?? EProjectBilling.FLAT_FEE,
		clientId: clientIdOf(project)
	};
}

/** A new start on or after the end moves the end one month later, as the previous wizard did. */
export function endDateAfterNewStart(start: Date, end: Date | null) {
	if (!end) {
		return addMonth(start);
	}
	const startsAfterEnd = isAfter(start, end);
	const startsOnEnd = isEqual(start, end);
	const needsNewEnd = startsAfterEnd || startsOnEnd;
	if (!needsNewEnd) {
		return end;
	}
	return addMonth(start);
}

function addMonth(date: Date) {
	const next = new Date(date);
	next.setMonth(next.getMonth() + 1);
	return next;
}

/** One role per person: picking someone as a manager takes them out of the members, and the reverse. */
export function assignProjectRole(
	draft: Pick<ProjectDraft, 'managerIds' | 'memberIds'>,
	employeeId: string,
	role: ProjectMemberRole
) {
	const managerIds = draft.managerIds.filter((id) => id !== employeeId);
	const memberIds = draft.memberIds.filter((id) => id !== employeeId);
	if (role === 'manager') {
		managerIds.push(employeeId);
	}
	if (role === 'member') {
		memberIds.push(employeeId);
	}
	return { managerIds, memberIds };
}

export function removeFromProject(draft: Pick<ProjectDraft, 'managerIds' | 'memberIds'>, employeeId: string) {
	return {
		managerIds: draft.managerIds.filter((id) => id !== employeeId),
		memberIds: draft.memberIds.filter((id) => id !== employeeId)
	};
}

/**
 * Who may leave the project's team list: any team but the active one; the active team only for an admin, and only
 * while another team stays selected, so a project never ends up outside every team.
 */
export function canDeselectProjectTeam(
	teamId: string,
	selectedTeamIds: string[],
	activeTeamId: string | null | undefined,
	isAdmin: boolean
) {
	const isActiveTeam = teamId === activeTeamId;
	if (!isActiveTeam) {
		return true;
	}
	if (!isAdmin) {
		return false;
	}
	const otherSelectedTeams = selectedTeamIds.filter((id) => id !== activeTeamId);
	return otherSelectedTeams.length > 0;
}

/** A dictated team list keeps every selected team the person may not take out, as the picker does. */
export function teamIdsKeepingLocked(
	selectedTeamIds: string[],
	wantedTeamIds: string[],
	activeTeamId: string | null | undefined,
	isAdmin: boolean
) {
	const teamIds = [...new Set(wantedTeamIds)];
	for (const teamId of selectedTeamIds) {
		const isKept = teamIds.includes(teamId);
		if (isKept) {
			continue;
		}
		const canLeave = canDeselectProjectTeam(teamId, teamIds, activeTeamId, isAdmin);
		if (!canLeave) {
			teamIds.push(teamId);
		}
	}
	return teamIds;
}

/**
 * The roles once a dictation names managers, members or both: still one role per person, and a person named in
 * both lists stays a manager.
 */
export function rolesAfterDictation(
	draft: Pick<ProjectDraft, 'managerIds' | 'memberIds'>,
	managerIds: string[] | undefined,
	memberIds: string[] | undefined
) {
	const dictatedMembers = memberIds ?? [];
	let managers = draft.managerIds.filter((id) => !dictatedMembers.includes(id));
	if (managerIds) {
		managers = [...new Set(managerIds)];
	}
	const baseMembers = memberIds ?? draft.memberIds;
	const uniqueMembers = [...new Set(baseMembers)];
	const members = uniqueMembers.filter((id) => !managers.includes(id));
	return { managerIds: managers, memberIds: members };
}

export function projectImageErrorOf(file: File): DottedLanguageObjectStringPaths | null {
	const isTooLarge = file.size > PROJECT_IMAGE_MAX_BYTES;
	if (isTooLarge) {
		return 'pages.projects.basicInformationForm.errors.fileSizeLimit';
	}
	const isAllowedType = PROJECT_IMAGE_TYPES.includes(file.type);
	if (!isAllowedType) {
		return 'pages.projects.basicInformationForm.errors.fileFormatLimit';
	}
	return null;
}

function nameErrorOf(name: string): DottedLanguageObjectStringPaths | null {
	const trimmed = name.trim();
	if (!trimmed) {
		return 'pages.projects.basicInformationForm.errors.titleRequired';
	}
	const isTooShort = trimmed.length < PROJECT_NAME_MIN_LENGTH;
	const isTooLong = trimmed.length > PROJECT_NAME_MAX_LENGTH;
	const hasWrongLength = isTooShort || isTooLong;
	if (hasWrongLength) {
		return 'pages.projects.basicInformationForm.errors.titleLength';
	}
	return null;
}

function datesErrorOf(startDate: Date | null, endDate: Date | null): DottedLanguageObjectStringPaths | null {
	if (!startDate) {
		return 'pages.projects.basicInformationForm.errors.startDateRequired';
	}
	if (!endDate) {
		return 'pages.projects.basicInformationForm.errors.endDateRequired';
	}
	const days = differenceInDays(endDate, startDate);
	if (days <= 0) {
		return 'pages.projects.basicInformationForm.errors.endDateAfterStart';
	}
	return null;
}

function urlErrorOf(projectUrl: string): DottedLanguageObjectStringPaths | null {
	const url = projectUrl.trim();
	if (!url) {
		return null;
	}
	if (isValidUrl(url)) {
		return null;
	}
	return 'pages.projects.basicInformationForm.errors.invalidWebsiteUrl';
}

export function validateProjectDraft(draft: ProjectDraft, isDescriptionValid: boolean): ProjectDraftErrors {
	const errors: ProjectDraftErrors = {};
	const nameError = nameErrorOf(draft.name);
	if (nameError) {
		errors.name = nameError;
	}
	const datesError = datesErrorOf(draft.startDate, draft.endDate);
	if (datesError) {
		errors.dates = datesError;
	}
	const urlError = urlErrorOf(draft.projectUrl);
	if (urlError) {
		errors.projectUrl = urlError;
	}
	const taskKey = draft.taskKey.trim().toUpperCase();
	if (taskKey && !TASK_KEY_PATTERN.test(taskKey)) {
		errors.taskKey = 'pages.projects.basicInformationForm.errors.taskKeyInvalid';
	}
	if (!isDescriptionValid) {
		errors.description = 'pages.projects.basicInformationForm.errors.descriptionWordLimit';
	}
	const hasNoTeam = draft.teamIds.length === 0;
	if (hasNoTeam) {
		errors.teams = 'pages.projects.teamAndRelationsForm.errors.atLeastOneTeamRequired';
	}
	return errors;
}

export function hasDraftErrors(errors: ProjectDraftErrors) {
	return Object.keys(errors).length > 0;
}

/** Without a manager, the person creating or saving the project becomes its manager, as the previous wizard did. */
function rolesWithDefaultManager(
	draft: Pick<ProjectDraft, 'managerIds' | 'memberIds'>,
	currentEmployeeId: string | null | undefined
) {
	const hasManager = draft.managerIds.length > 0;
	const canDefault = Boolean(currentEmployeeId);
	const keepsRoles = hasManager || !canDefault;
	if (keepsRoles) {
		return { managerIds: draft.managerIds, memberIds: draft.memberIds };
	}
	return assignProjectRole(draft, currentEmployeeId as string, 'manager');
}

interface ProjectRequestContext {
	base?: TOrganizationProject | null;
	teams: TOrganizationTeam[];
	tags: TTag[];
	currentEmployeeId?: string | null;
	uploadedImage?: ProjectImageAsset | null;
}

function imageFieldsOf(draft: ProjectDraft, uploadedImage: ProjectImageAsset | null | undefined) {
	if (uploadedImage) {
		return { imageUrl: uploadedImage.fullUrl ?? undefined, imageId: uploadedImage.id ?? undefined };
	}
	return { imageUrl: draft.imageUrl, imageId: draft.imageId };
}

/** A new project without a client leaves the field out; an edited one sends null, which clears the stored client. */
function clientFieldOf(draft: Pick<ProjectDraft, 'clientId'>, base: TOrganizationProject | null | undefined) {
	if (draft.clientId) {
		return { organizationContactId: draft.clientId };
	}
	if (base) {
		return { organizationContactId: null };
	}
	return {};
}

/** The request body the previous wizard's review step sent, built from one draft. */
export function buildProjectRequest(draft: ProjectDraft, context: ProjectRequestContext) {
	const { base, teams, tags, currentEmployeeId, uploadedImage } = context;
	const roles = rolesWithDefaultManager(draft, currentEmployeeId);
	const selectedTeams = teams.filter((team) => draft.teamIds.includes(team.id));
	const selectedTags = tags.filter((tag) => draft.tagIds.includes(tag.id));
	const image = imageFieldsOf(draft, uploadedImage);
	const status = draft.status ?? base?.status ?? ETaskStatusName.OPEN;
	const request: Partial<TCreateProjectRequest> = {
		name: draft.name.trim(),
		startDate: draft.startDate ?? undefined,
		endDate: draft.endDate ?? undefined,
		projectUrl: draft.projectUrl.trim(),
		// Empty: left out — on create the platform gives the first letters of the name, on edit the key stays.
		...(draft.taskKey.trim() ? { taskKey: draft.taskKey.trim().toUpperCase() } : {}),
		description: draft.description,
		imageUrl: image.imageUrl,
		imageId: image.imageId,
		tags: selectedTags,
		color: draft.color ?? undefined,
		memberIds: roles.memberIds,
		managerIds: roles.managerIds,
		budget: draft.budget ?? undefined,
		currency: draft.currency ?? undefined,
		budgetType: draft.budgetType,
		billing: draft.billing,
		teams: selectedTeams,
		status: status as ETaskStatusName,
		isActive: base?.isActive ?? true,
		isArchived: base?.isArchived ?? false,
		isTasksAutoSync: base?.isTasksAutoSync ?? true,
		isTasksAutoSyncOnLabel: base?.isTasksAutoSyncOnLabel ?? true,
		...clientFieldOf(draft, base)
	};
	return request;
}

/**
 * The teams the dialog can show: the ones the user may pick, plus the teams the project already belongs to, so
 * saving a project never drops a team the user could not see in the picker (the previous wizard did).
 */
export function teamsForProject(
	availableTeams: TOrganizationTeam[],
	project: TOrganizationProject | null | undefined
): TOrganizationTeam[] {
	const knownIds = new Set(availableTeams.map((team) => team.id));
	const projectTeams: TOrganizationTeam[] = [];
	for (const team of project?.teams ?? []) {
		const isUsable = Boolean(team?.id) && !knownIds.has(team.id);
		if (isUsable) {
			projectTeams.push(team as TOrganizationTeam);
			knownIds.add(team.id);
		}
	}
	if (projectTeams.length === 0) {
		return availableTeams;
	}
	return [...availableTeams, ...projectTeams];
}

export interface ProjectPersonOption extends ProjectPerson {
	teamNames: string[];
}

/** Everyone the project can take: the members of the available teams, plus the people already on the project. */
export function projectPeopleOptions(
	teams: TOrganizationTeam[],
	project: TOrganizationProject | null | undefined
): ProjectPersonOption[] {
	const people = new Map<string, ProjectPersonOption>();
	for (const team of teams) {
		for (const member of team.members ?? []) {
			const employeeId = member?.employeeId;
			if (!employeeId) {
				continue;
			}
			const known = people.get(employeeId);
			if (known) {
				known.teamNames.push(team.name);
				continue;
			}
			const employee = member?.employee;
			const user = employee?.user;
			const name = employee?.fullName || user?.name || '';
			people.set(employeeId, {
				id: employeeId,
				name,
				imageUrl: user?.imageUrl,
				email: user?.email,
				teamNames: [team.name]
			});
		}
	}
	for (const member of project?.members ?? []) {
		const person = personFromProjectMember(member);
		const isKnown = people.has(person.id);
		if (!isKnown) {
			people.set(person.id, { ...person, teamNames: [] });
		}
	}
	return Array.from(people.values());
}

/** A six-digit hex: the previous `toString(16)` dropped leading zeros and produced five-digit colours. */
export function randomTagColor() {
	const value = Math.floor(Math.random() * 0xffffff);
	const hex = value.toString(16).padStart(6, '0');
	return `#${hex}`;
}
