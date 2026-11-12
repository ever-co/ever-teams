'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAtomValue } from 'jotai';
import type { DottedLanguageObjectStringPaths } from 'next-intl';
import { activeTeamState, organizationTeamsState } from '@/core/stores';
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
import { emptyClientDraft, isArchivedClient } from '@/core/lib/utils/clients';
import { clientNameOf } from '@/core/lib/utils/project-list';
import {
	assignProjectRole,
	buildProjectRequest,
	canDeselectProjectTeam,
	draftFromProject,
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
	const activeTeam = useAtomValue(activeTeamState);
	const organizationTeams = useAtomValue(organizationTeamsState);
	const { data: user } = useUserQuery();
	const { tags: fetchedTags } = useTagsQuery();
	const { createTag, createTagLoading } = useCreateTag();
	const { createImageAssets, loading: isUploadingImage } = useImageAssets();
	const { createOrganizationProject, createOrganizationProjectLoading } = useCreateOrganizationProject();
	const { editOrganizationProject, editOrganizationProjectLoading } = useEditOrganizationProject();
	const {
		clients: fetchedClients,
		isLoaded: isClientListLoaded,
		isError: isClientListError
	} = useClientsQuery({ includeArchived: true });
	const { canCreate: mayCreateClient } = useClientAccess();
	const { createClient, isCreating: isCreatingClient } = useClientMutations();
	// A name is offered for creation only against the whole list: an empty list that is loading or failed would offer
	// to create a client that already exists.
	const canCreateClient = mayCreateClient && isClientListLoaded;
	const hasClientListFailed = isClientListError && !isClientListLoaded;

	const activeTeamId = activeTeam?.id ?? null;
	const isAdmin = isAdminRole(user?.role?.name);
	const currentEmployeeId = user?.employee?.id ?? user?.employeeId ?? null;

	const [draft, setDraft] = useState<ProjectDraft>(() => {
		if (mode === 'edit' && project) {
			return draftFromProject(project, activeTeamId);
		}
		return emptyProjectDraft(activeTeamId);
	});
	const [imageFile, setImageFile] = useState<File | null>(null);
	const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
	const [imageError, setImageError] = useState<DottedLanguageObjectStringPaths | null>(null);
	const [isDescriptionValid, setIsDescriptionValid] = useState(true);
	const [hasTriedSubmit, setHasTriedSubmit] = useState(false);
	const [submitError, setSubmitError] = useState<ProjectComposerSubmitError>(null);
	const [createdTags, setCreatedTags] = useState<TTag[]>([]);

	const [createdClients, setCreatedClients] = useState<TClient[]>([]);
	const [hasClientCreateFailed, setHasClientCreateFailed] = useState(false);

	const tags = useMemo(() => withCreatedTags(fetchedTags, createdTags), [fetchedTags, createdTags]);

	const clients = useMemo(() => withCreatedClients(fetchedClients, createdClients), [fetchedClients, createdClients]);
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
		setDraft((current) => ({ ...current, ...patch }));
		setSubmitError(null);
	}, []);

	const setName = useCallback((name: string) => updateDraft({ name }), [updateDraft]);

	const appendToName = useCallback((dictated: string) => {
		setDraft((current) => ({ ...current, name: appendDictatedText(current.name, dictated) }));
	}, []);

	const setDescription = useCallback((description: string) => updateDraft({ description }), [updateDraft]);

	const setStatus = useCallback((status: string) => updateDraft({ status }), [updateDraft]);

	const setProjectUrl = useCallback((projectUrl: string) => updateDraft({ projectUrl }), [updateDraft]);

	const setTaskKey = useCallback((taskKey: string) => updateDraft({ taskKey: taskKey.toUpperCase() }), [updateDraft]);

	const setStartDate = useCallback((startDate: Date) => {
		setDraft((current) => ({
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
			setDraft((current) => ({
				...current,
				teamIds: teamIdsKeepingLocked(current.teamIds, teamIds, activeTeamId, isAdmin)
			}));
			setSubmitError(null);
		},
		[activeTeamId, isAdmin]
	);

	const setRoles = useCallback((managerIds: string[] | undefined, memberIds: string[] | undefined) => {
		setDraft((current) => ({ ...current, ...rolesAfterDictation(current, managerIds, memberIds) }));
		setSubmitError(null);
	}, []);

	const setTagIds = useCallback((tagIds: string[]) => updateDraft({ tagIds }), [updateDraft]);

	const restoreFields = useCallback((fields: Partial<ProjectDraft>) => updateDraft(fields), [updateDraft]);

	const togglePerson = useCallback((employeeId: string, role: ProjectMemberRole) => {
		setDraft((current) => {
			const hasRole = idsWithRole(current, role).includes(employeeId);
			if (hasRole) {
				return { ...current, ...removeFromProject(current, employeeId) };
			}
			return { ...current, ...assignProjectRole(current, employeeId, role) };
		});
		setSubmitError(null);
	}, []);

	const toggleTag = useCallback((tagId: string) => {
		setDraft((current) => ({ ...current, tagIds: toggleId(current.tagIds, tagId) }));
	}, []);

	const addTag = useCallback(
		(name: string) => {
			const tagName = name.trim();
			if (!tagName) {
				return;
			}
			const selectCreatedTag = (tag: TTag) => {
				setCreatedTags((current) => [...current, tag]);
				setDraft((current) => ({ ...current, tagIds: [...current.tagIds, tag.id] }));
			};
			createTag({ name: tagName, color: randomTagColor() }, { onSuccess: selectCreatedTag });
		},
		[createTag]
	);

	const setClientId = useCallback(
		(clientId: string | null) => {
			setHasClientCreateFailed(false);
			updateDraft({ clientId });
		},
		[updateDraft]
	);

	const clientIdBeforeCreate = draft.clientId;
	const addClient = useCallback(
		async (name: string) => {
			setHasClientCreateFailed(false);
			try {
				const client = await createClient(emptyClientDraft(name));
				setCreatedClients((current) => [...current, client]);
				// A client picked while this one was being created stays the project's client
				setDraft((current) => {
					const isSelectionUnchanged = current.clientId === clientIdBeforeCreate;
					if (!isSelectionUnchanged) {
						return current;
					}
					return { ...current, clientId: client.id };
				});
				setSubmitError(null);
			} catch {
				setHasClientCreateFailed(true);
			}
		},
		[clientIdBeforeCreate, createClient]
	);

	const setBudgetType = useCallback((budgetType: EProjectBudgetType) => updateDraft({ budgetType }), [updateDraft]);

	const setBudget = useCallback((budget: number | null) => updateDraft({ budget }), [updateDraft]);

	const setCurrency = useCallback((currency: string) => updateDraft({ currency }), [updateDraft]);

	const setBilling = useCallback((billing: EProjectBilling) => updateDraft({ billing }), [updateDraft]);

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
		// The client being created is not on the draft yet: the project waits for it, by the button and the shortcut
		if (isCreatingClient) {
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
		isCreatingClient,
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
	const isSubmitting = isSaving || isUploadingImage || isCreatingClient;
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
		canCreateClient,
		isCreatingClient,
		hasClientCreateFailed,
		hasClientListFailed,
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
		restoreFields,
		submit
	};
}

export type ProjectComposerState = ReturnType<typeof useProjectComposer>;
