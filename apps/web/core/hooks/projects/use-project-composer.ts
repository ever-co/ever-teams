'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAtomValue } from 'jotai';
import type { DottedLanguageObjectStringPaths } from 'next-intl';
import { activeTeamState, organizationTeamsState } from '@/core/stores';
import { currentOrganizationState } from '@/core/stores/user/user-organizations';
import { useGetCurrentOrganization } from '@/core/hooks/auth/use-current-organization';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { useTagsQuery } from '@/core/hooks/tags/use-tags-query';
import { useCreateTag } from '@/core/hooks/tags/use-create-tag';
import { useImageAssets } from '@/core/hooks/common/use-image-assets';
import { appendDictatedText } from '@/core/hooks/ai/use-dictation';
import { useCreateOrganizationProject } from '@/core/hooks/organizations/projects/use-create-organization-project';
import { useEditOrganizationProject } from '@/core/hooks/organizations/projects/use-edit-organization-project';
import { useClientAccess } from '@/core/hooks/clients/use-client-access';
import { useClientMutations } from '@/core/hooks/clients/use-client-mutations';
import { useClientsQuery } from '@/core/hooks/clients/use-clients-query';
import { emptyClientDraft, isArchivedClient, listReadStateOf } from '@/core/lib/utils/clients';
import { clientNameOf } from '@/core/lib/utils/project-list';
import {
	assignProjectRole,
	buildProjectRequest,
	canDeselectProjectTeam,
	draftFromProject,
	draftInWorkspaceCurrency,
	emptyProjectDraft,
	endDateAfterNewStart,
	hasDraftErrors,
	projectImageErrorOf,
	projectPeopleOptions,
	teamsForProject,
	randomTagColor,
	removeFromProject,
	rolesAfterDictation,
	teamIdsKeepingLocked,
	validateProjectDraft,
	type ProjectDraft,
	type ProjectDraftErrors,
	type ProjectImageAsset,
	type ProjectMemberRole
} from '@/core/lib/utils/project-composer';
import { ERoleName } from '@/core/types/generics/enums/role';
import type { EProjectBilling, EProjectBudgetType } from '@/core/types/generics/enums/project';
import type { TClient, TOrganizationProject, TTag } from '@/core/types/schemas';

export type ProjectComposerMode = 'create' | 'edit';

interface UseProjectComposerOptions {
	mode: ProjectComposerMode;
	project?: TOrganizationProject | null;
	onDone?: (project: TOrganizationProject) => void;
}

export type ProjectComposerSubmitError = 'save' | 'upload' | null;

const ADMIN_ROLES = new Set<string>([ERoleName.ADMIN, ERoleName.SUPER_ADMIN]);

function isAdminRole(roleName: string | null | undefined) {
	if (!roleName) {
		return false;
	}
	return ADMIN_ROLES.has(roleName);
}

function idsWithRole(draft: Pick<ProjectDraft, 'managerIds' | 'memberIds'>, role: ProjectMemberRole) {
	if (role === 'manager') {
		return draft.managerIds;
	}
	return draft.memberIds;
}

/** A tag created from the dialog is usable at once, before the tag list has been fetched again. */
function withCreatedTags(tags: TTag[], createdTags: TTag[]) {
	const knownIds = new Set(tags.map((tag) => tag.id));
	const missingTags = createdTags.filter((tag) => !knownIds.has(tag.id));
	if (missingTags.length === 0) {
		return tags;
	}
	return [...tags, ...missingTags];
}

/** A client created from the dialog is usable at once, before the client list has been fetched again. */
function withCreatedClients(clients: TClient[], createdClients: TClient[]) {
	const knownIds = new Set(clients.map((client) => client.id));
	const missingClients = createdClients.filter((client) => !knownIds.has(client.id));
	if (missingClients.length === 0) {
		return clients;
	}
	return [...clients, ...missingClients];
}

/**
 * The project's client as the dialog shows it. A client the list does not hold (the viewer may not read clients)
 * keeps the name the project came with.
 */
function selectedClientOf(
	clientId: string | null,
	clients: TClient[],
	project: TOrganizationProject | null | undefined
) {
	if (!clientId) {
		return null;
	}
	const client = clients.find((candidate) => candidate.id === clientId);
	if (client) {
		return { id: client.id, name: client.name, isArchived: isArchivedClient(client) };
	}
	let projectClientName: string | null = null;
	if (project) {
		projectClientName = clientNameOf(project);
	}
	return { id: clientId, name: projectClientName ?? '', isArchived: false };
}

function toggleId(ids: string[], id: string) {
	const isSelected = ids.includes(id);
	if (isSelected) {
		return ids.filter((selected) => selected !== id);
	}
	return [...ids, id];
}

export function useProjectComposer({ mode, project, onDone }: UseProjectComposerOptions) {
	const isNewProject = mode === 'create';
	// The form opens from any page, and most of them do not read the organization its currency comes from
	useGetCurrentOrganization({ enabled: isNewProject });
	const activeTeam = useAtomValue(activeTeamState);
	const organizationTeams = useAtomValue(organizationTeamsState);
	const organization = useAtomValue(currentOrganizationState);
	const { data: user } = useUserQuery();
	const { tags: fetchedTags } = useTagsQuery();
	const { createTag, createTagLoading } = useCreateTag();
	const { createImageAssets, loading: isUploadingImage } = useImageAssets();
	const { createOrganizationProject, createOrganizationProjectLoading } = useCreateOrganizationProject();
	const { editOrganizationProject, editOrganizationProjectLoading } = useEditOrganizationProject();
	const {
		clients: fetchedClients,
		isLoaded: isClientListLoaded,
		isError: hasClientListFailed,
		refetch: refetchClientList
	} = useClientsQuery({ includeArchived: true });
	const { canCreate: mayCreateClients } = useClientAccess();
	const { createClient, isCreating: isCreatingClient } = useClientMutations();

	const activeTeamId = activeTeam?.id ?? null;
	const isAdmin = isAdminRole(user?.role?.name);
	const currentEmployeeId = user?.employee?.id ?? user?.employeeId ?? null;

	const [enteredDraft, setEnteredDraft] = useState<ProjectDraft>(() => {
		if (mode === 'edit' && project) {
			return draftFromProject(project, activeTeamId);
		}
		return emptyProjectDraft(activeTeamId);
	});
	const workspaceCurrency = organization?.currency ?? null;
	const draft = useMemo(() => {
		if (!isNewProject) {
			return enteredDraft;
		}
		return draftInWorkspaceCurrency(enteredDraft, workspaceCurrency);
	}, [enteredDraft, isNewProject, workspaceCurrency]);
	const [imageFile, setImageFile] = useState<File | null>(null);
	const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
	const [imageError, setImageError] = useState<DottedLanguageObjectStringPaths | null>(null);
	const [isDescriptionValid, setIsDescriptionValid] = useState(true);
	const [hasTriedSubmit, setHasTriedSubmit] = useState(false);
	const [submitError, setSubmitError] = useState<ProjectComposerSubmitError>(null);
	const [createdTags, setCreatedTags] = useState<TTag[]>([]);

	const [createdClients, setCreatedClients] = useState<TClient[]>([]);
	const [hasClientCreateFailed, setHasClientCreateFailed] = useState(false);
	// Counts the choices made in the Client field: a client created meanwhile must not replace a later one.
	const clientChoiceCount = useRef(0);
	// The draft waits for a client being created only while that creation is still the last choice in the field.
	const [isAwaitingCreatedClient, setIsAwaitingCreatedClient] = useState(false);

	const tags = useMemo(() => withCreatedTags(fetchedTags, createdTags), [fetchedTags, createdTags]);

	const clients = useMemo(() => withCreatedClients(fetchedClients, createdClients), [fetchedClients, createdClients]);
	const clientListState = listReadStateOf(isClientListLoaded, hasClientListFailed);
	const isClientListReady = clientListState === 'ready';
	// Without the list a typed name cannot be told from an existing client: creating it could repeat that client.
	const canCreateClient = mayCreateClients && isClientListReady;
	const pickableClients = useMemo(() => clients.filter((client) => !isArchivedClient(client)), [clients]);
	const selectedClient = useMemo(
		() => selectedClientOf(draft.clientId, clients, project),
		[draft.clientId, clients, project]
	);

	useEffect(() => {
		return () => {
			if (imagePreviewUrl) {
				URL.revokeObjectURL(imagePreviewUrl);
			}
		};
	}, [imagePreviewUrl]);

	const pickableTeams = useMemo(() => {
		if (isAdmin) {
			return organizationTeams;
		}
		if (activeTeam) {
			return [activeTeam];
		}
		return [];
	}, [isAdmin, organizationTeams, activeTeam]);

	const teams = useMemo(() => teamsForProject(pickableTeams, project), [pickableTeams, project]);

	const people = useMemo(() => projectPeopleOptions(pickableTeams, project), [pickableTeams, project]);

	const validationErrors = useMemo(
		() => validateProjectDraft(draft, isDescriptionValid),
		[draft, isDescriptionValid]
	);

	const errors = useMemo<ProjectDraftErrors>(() => {
		const shown: ProjectDraftErrors = {};
		if (hasTriedSubmit) {
			Object.assign(shown, validationErrors);
		}
		if (imageError) {
			shown.image = imageError;
		}
		const isDescriptionTooLong = Boolean(validationErrors.description);
		if (isDescriptionTooLong) {
			shown.description = validationErrors.description;
		}
		return shown;
	}, [hasTriedSubmit, validationErrors, imageError]);

	const updateDraft = useCallback((patch: Partial<ProjectDraft>) => {
		setEnteredDraft((current) => ({ ...current, ...patch }));
		setSubmitError(null);
	}, []);

	const setName = useCallback((name: string) => updateDraft({ name }), [updateDraft]);

	const appendToName = useCallback((dictated: string) => {
		setEnteredDraft((current) => ({ ...current, name: appendDictatedText(current.name, dictated) }));
	}, []);

	const setDescription = useCallback((description: string) => updateDraft({ description }), [updateDraft]);

	const setStatus = useCallback((status: string) => updateDraft({ status }), [updateDraft]);

	const setProjectUrl = useCallback((projectUrl: string) => updateDraft({ projectUrl }), [updateDraft]);

	const setTaskKey = useCallback((taskKey: string) => updateDraft({ taskKey: taskKey.toUpperCase() }), [updateDraft]);

	const setStartDate = useCallback((startDate: Date) => {
		setEnteredDraft((current) => ({
			...current,
			startDate,
			endDate: endDateAfterNewStart(startDate, current.endDate)
		}));
	}, []);

	const setEndDate = useCallback((endDate: Date) => updateDraft({ endDate }), [updateDraft]);

	const setColor = useCallback((color: string) => updateDraft({ color }), [updateDraft]);

	const pickImage = useCallback(
		(file: File) => {
			const fileError = projectImageErrorOf(file);
			if (fileError) {
				setImageError(fileError);
				return;
			}
			setImageError(null);
			setImageFile(file);
			setImagePreviewUrl(URL.createObjectURL(file));
			updateDraft({ imageUrl: null, imageId: null });
		},
		[updateDraft]
	);

	const removeImage = useCallback(() => {
		setImageError(null);
		setImageFile(null);
		setImagePreviewUrl(null);
		updateDraft({ imageUrl: null, imageId: null });
	}, [updateDraft]);

	const canDeselectTeam = useCallback(
		(teamId: string) => canDeselectProjectTeam(teamId, draft.teamIds, activeTeamId, isAdmin),
		[draft.teamIds, activeTeamId, isAdmin]
	);

	const toggleTeam = useCallback(
		(teamId: string) => {
			const isSelected = draft.teamIds.includes(teamId);
			const isLocked = isSelected && !canDeselectTeam(teamId);
			if (isLocked) {
				return;
			}
			updateDraft({ teamIds: toggleId(draft.teamIds, teamId) });
		},
		[draft.teamIds, canDeselectTeam, updateDraft]
	);

	const setTeamIds = useCallback(
		(teamIds: string[]) => {
			setEnteredDraft((current) => ({
				...current,
				teamIds: teamIdsKeepingLocked(current.teamIds, teamIds, activeTeamId, isAdmin)
			}));
			setSubmitError(null);
		},
		[activeTeamId, isAdmin]
	);

	const setRoles = useCallback((managerIds: string[] | undefined, memberIds: string[] | undefined) => {
		setEnteredDraft((current) => ({ ...current, ...rolesAfterDictation(current, managerIds, memberIds) }));
		setSubmitError(null);
	}, []);

	const setTagIds = useCallback((tagIds: string[]) => updateDraft({ tagIds }), [updateDraft]);

	const restoreFields = useCallback((fields: Partial<ProjectDraft>) => updateDraft(fields), [updateDraft]);

	const togglePerson = useCallback((employeeId: string, role: ProjectMemberRole) => {
		setEnteredDraft((current) => {
			const hasRole = idsWithRole(current, role).includes(employeeId);
			if (hasRole) {
				return { ...current, ...removeFromProject(current, employeeId) };
			}
			return { ...current, ...assignProjectRole(current, employeeId, role) };
		});
		setSubmitError(null);
	}, []);

	const toggleTag = useCallback((tagId: string) => {
		setEnteredDraft((current) => ({ ...current, tagIds: toggleId(current.tagIds, tagId) }));
	}, []);

	const addTag = useCallback(
		(name: string) => {
			const tagName = name.trim();
			if (!tagName) {
				return;
			}
			const selectCreatedTag = (tag: TTag) => {
				setCreatedTags((current) => [...current, tag]);
				setEnteredDraft((current) => ({ ...current, tagIds: [...current.tagIds, tag.id] }));
			};
			createTag({ name: tagName, color: randomTagColor() }, { onSuccess: selectCreatedTag });
		},
		[createTag]
	);

	const setClientId = useCallback(
		(clientId: string | null) => {
			clientChoiceCount.current += 1;
			setIsAwaitingCreatedClient(false);
			setHasClientCreateFailed(false);
			updateDraft({ clientId });
		},
		[updateDraft]
	);

	const addClient = useCallback(
		async (name: string) => {
			clientChoiceCount.current += 1;
			const choiceAtStart = clientChoiceCount.current;
			const isStillTheChoice = () => clientChoiceCount.current === choiceAtStart;
			setIsAwaitingCreatedClient(true);
			setHasClientCreateFailed(false);
			try {
				const client = await createClient(emptyClientDraft(name));
				setCreatedClients((current) => [...current, client]);
				if (isStillTheChoice()) {
					updateDraft({ clientId: client.id });
				}
			} catch {
				// A creation replaced by another pick or a clear meanwhile no longer speaks for the field
				if (isStillTheChoice()) {
					setHasClientCreateFailed(true);
				}
			}
			if (isStillTheChoice()) {
				setIsAwaitingCreatedClient(false);
			}
		},
		[createClient, updateDraft]
	);

	const retryClientList = useCallback(() => {
		void refetchClientList();
	}, [refetchClientList]);

	const setBudgetType = useCallback((budgetType: EProjectBudgetType) => updateDraft({ budgetType }), [updateDraft]);

	const setBudget = useCallback((budget: number | null) => updateDraft({ budget }), [updateDraft]);

	const setCurrency = useCallback((currency: string) => updateDraft({ currency }), [updateDraft]);

	const setBilling = useCallback((billing: EProjectBilling) => updateDraft({ billing }), [updateDraft]);

	const setBillable = useCallback((billable: boolean) => updateDraft({ billable }), [updateDraft]);

	const uploadImage = useCallback(async (): Promise<ProjectImageAsset | null | 'failed'> => {
		if (!imageFile) {
			return null;
		}
		try {
			return await createImageAssets(imageFile, 'project_images');
		} catch {
			return 'failed';
		}
	}, [imageFile, createImageAssets]);

	const editedProjectId = project?.id;
	const saveProject = useCallback(
		(request: ReturnType<typeof buildProjectRequest>) => {
			const isEdit = mode === 'edit';
			if (isEdit && editedProjectId) {
				return editOrganizationProject(editedProjectId, request);
			}
			return createOrganizationProject(request);
		},
		[mode, editedProjectId, editOrganizationProject, createOrganizationProject]
	);

	const submit = useCallback(async () => {
		// A client being created is not in the draft yet: saving now would leave it out of the project.
		if (isAwaitingCreatedClient) {
			return;
		}
		setHasTriedSubmit(true);
		setSubmitError(null);
		const hasErrors = hasDraftErrors(validationErrors);
		if (hasErrors) {
			return;
		}
		const uploadedImage = await uploadImage();
		if (uploadedImage === 'failed') {
			setImageError('pages.projects.basicInformationForm.errors.uploadError');
			setSubmitError('upload');
			return;
		}
		const request = buildProjectRequest(draft, {
			base: project,
			teams,
			tags,
			currentEmployeeId,
			uploadedImage
		});
		const savedProject = await saveProject(request);
		if (!savedProject) {
			setSubmitError('save');
			return;
		}
		onDone?.(savedProject);
	}, [
		isAwaitingCreatedClient,
		validationErrors,
		uploadImage,
		draft,
		project,
		teams,
		tags,
		currentEmployeeId,
		saveProject,
		onDone
	]);

	const isSaving = createOrganizationProjectLoading || editOrganizationProjectLoading;
	const isSubmitting = isSaving || isUploadingImage;
	const tileImageUrl = imagePreviewUrl ?? draft.imageUrl;

	return {
		draft,
		errors,
		submitError,
		isSubmitting,
		isUploadingImage,
		tileImageUrl,
		teams,
		people,
		tags,
		activeTeamId,
		isAdmin,
		createTagLoading,
		pickableClients,
		selectedClient,
		clientListState,
		retryClientList,
		canCreateClient,
		isCreatingClient,
		isAwaitingCreatedClient,
		hasClientCreateFailed,
		setClientId,
		addClient,
		canDeselectTeam,
		setName,
		appendToName,
		setDescription,
		setIsDescriptionValid,
		setStatus,
		setProjectUrl,
		setTaskKey,
		setStartDate,
		setEndDate,
		setColor,
		pickImage,
		removeImage,
		toggleTeam,
		setTeamIds,
		togglePerson,
		setRoles,
		toggleTag,
		setTagIds,
		addTag,
		setBudgetType,
		setBudget,
		setCurrency,
		setBilling,
		setBillable,
		restoreFields,
		submit
	};
}

export type ProjectComposerState = ReturnType<typeof useProjectComposer>;
