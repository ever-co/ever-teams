'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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
import type { TOrganizationProject, TTag } from '@/core/types/schemas';

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

	const tags = useMemo(() => withCreatedTags(fetchedTags, createdTags), [fetchedTags, createdTags]);

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
	}, [validationErrors, uploadImage, draft, project, teams, tags, currentEmployeeId, saveProject, onDone]);

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
