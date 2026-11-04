'use client';

import { useCallback } from 'react';
import { useAtomValue } from 'jotai';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslations, type DottedLanguageObjectStringPaths } from 'next-intl';
import { DAILY_PLAN_SUGGESTION_MODAL_DATE } from '@/core/constants/config/constants';
import { activeTeamState } from '@/core/stores';
import { queryKeys } from '@/core/query/keys';
import { errorReasonKeyOf } from '@/core/lib/utils/error-feedback';
import { useImageAssets } from '@/core/hooks/common/use-image-assets';
import { useEditOrganizationTeam } from '@/core/hooks/organizations/teams/use-edit-organization-team';
import { useGetActiveTeam } from '@/core/hooks/organizations/teams/use-get-active-team';
import { useOrganizationEmployeeTeams } from '@/core/hooks/organizations/teams/use-organization-teams-employee';
import { useIsMemberManager } from '@/core/hooks/organizations/teams/use-team-member';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import type { TOrganizationTeamUpdate } from '@/core/types/schemas';

export const TEAM_AVATAR_FOLDER = 'organization_teams_avatars';

type TeamRule = Pick<TOrganizationTeamUpdate, 'shareProfileView'> | Pick<TOrganizationTeamUpdate, 'requirePlanToTrack'>;

export function useTeamGeneralSettings() {
	const t = useTranslations();
	const queryClient = useQueryClient();
	const activeTeam = useAtomValue(activeTeamState);
	const getActiveTeam = useGetActiveTeam();
	const { data: user } = useUserQuery();
	const { isTeamManager, activeManager } = useIsMemberManager(user);
	const { editOrganizationTeam } = useEditOrganizationTeam({ toastOnError: false });
	const { createImageAssets } = useImageAssets();
	const { updateOrganizationTeamEmployee } = useOrganizationEmployeeTeams();
	const teamId = activeTeam?.id;

	const showFailure = useCallback(
		(titleKey: DottedLanguageObjectStringPaths, error: unknown) => {
			const reasonKey = errorReasonKeyOf(error) as DottedLanguageObjectStringPaths;
			toast.error(t(titleKey), { description: t(reasonKey) });
		},
		[t]
	);

	const saveField = useCallback(
		async (data: Partial<TOrganizationTeamUpdate>, failureKey: DottedLanguageObjectStringPaths) => {
			if (!teamId) {
				throw new Error('No active team');
			}
			try {
				await editOrganizationTeam({ id: teamId, ...data });
			} catch (error) {
				showFailure(failureKey, error);
				throw error;
			}
		},
		[editOrganizationTeam, showFailure, teamId]
	);

	const saveName = useCallback((name: string) => saveField({ name }, 'toasts.teams.NAME_NOT_SAVED'), [saveField]);

	const saveColor = useCallback(
		(color: string | null) => saveField({ color }, 'toasts.teams.COLOR_NOT_SAVED'),
		[saveField]
	);

	const saveEmoji = useCallback(
		(emoji: string | null) => saveField({ emoji }, 'toasts.teams.EMOJI_NOT_SAVED'),
		[saveField]
	);

	const saveSize = useCallback(
		(teamSize: string) => saveField({ teamSize }, 'toasts.teams.SIZE_NOT_SAVED'),
		[saveField]
	);

	const saveVisibility = useCallback(
		async (isPublic: boolean) => {
			try {
				await saveField({ public: isPublic }, 'toasts.teams.TYPE_NOT_SAVED');
			} catch (error) {
				// The PUT may have landed even though the read that follows it failed
				queryClient.invalidateQueries({ queryKey: queryKeys.organizationTeams.all });
				throw error;
			}
		},
		[queryClient, saveField]
	);

	const uploadAvatar = useCallback(
		async (file: File) => {
			const team = getActiveTeam();
			if (!team) {
				throw new Error('No active team');
			}
			const image = await createImageAssets(file, TEAM_AVATAR_FOLDER);
			await editOrganizationTeam({ ...team, imageId: image.id, image });
		},
		[createImageAssets, editOrganizationTeam, getActiveTeam]
	);

	const removeAvatar = useCallback(async () => {
		const team = getActiveTeam();
		if (!team) {
			throw new Error('No active team');
		}
		await editOrganizationTeam({ ...team, imageId: null, image: null });
	}, [editOrganizationTeam, getActiveTeam]);

	// Gauzy rewrites the member set only when the body names `memberIds` or `managerIds`, so a rule sent alone
	// cannot drop someone who joined after the team was last read.
	const saveTeamRule = useCallback(
		async (rule: TeamRule) => {
			if (!teamId) {
				throw new Error('No active team');
			}
			try {
				await editOrganizationTeam({ id: teamId, ...rule });
			} catch (error) {
				showFailure('toasts.teams.UPDATE_FAILED', error);
				throw error;
			}
		},
		[editOrganizationTeam, showFailure, teamId]
	);

	const setShareProfileView = useCallback(
		(enabled: boolean) => saveTeamRule({ shareProfileView: enabled }),
		[saveTeamRule]
	);

	const setRequirePlanToTrack = useCallback(
		async (enabled: boolean) => {
			await saveTeamRule({ requirePlanToTrack: enabled });
			// The plan suggestion shows again once a plan is required
			if (enabled) {
				window.localStorage.removeItem(DAILY_PLAN_SUGGESTION_MODAL_DATE);
			}
		},
		[saveTeamRule]
	);

	const ownMemberRowId = activeManager?.id;
	const ownOrganizationId = activeManager?.organizationId;

	const setOwnTracking = useCallback(
		async (enabled: boolean) => {
			if (!ownMemberRowId || !teamId) {
				throw new Error('No membership row');
			}
			await updateOrganizationTeamEmployee(ownMemberRowId, {
				organizationId: ownOrganizationId,
				organizationTeamId: teamId,
				isTrackingEnabled: enabled
			});
		},
		[ownMemberRowId, ownOrganizationId, teamId, updateOrganizationTeamEmployee]
	);

	return {
		activeTeam,
		isTeamManager,
		ownTracking: activeManager?.isTrackingEnabled ?? false,
		hasOwnMembership: Boolean(ownMemberRowId),
		saveName,
		saveColor,
		saveEmoji,
		saveSize,
		saveVisibility,
		uploadAvatar,
		removeAvatar,
		setShareProfileView,
		setRequirePlanToTrack,
		setOwnTracking
	};
}
