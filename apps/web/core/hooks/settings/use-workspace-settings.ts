'use client';

import { useCallback, useRef } from 'react';
import { useAtomValue } from 'jotai';
import { useQueryClient, type QueryKey } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslations, type DottedLanguageObjectStringPaths } from 'next-intl';
import { useGetCurrentOrganization } from '@/core/hooks/auth/use-current-organization';
import { useWorkspaces } from '@/core/hooks/auth/use-workspaces';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { useMyRolePermissionsQuery } from '@/core/hooks/roles/use-my-role-permissions-query';
import { getAccessTokenCookie, getTenantIdCookie } from '@/core/lib/helpers/cookies';
import { errorReasonKeyOf } from '@/core/lib/utils/error-feedback';
import {
	UnfinishedRenameError,
	canEditWorkspace,
	canRenameWorkspace,
	isRenameMaybeUnfinished,
	isRenameRefused,
	organizationAfterSave,
	workspaceOfTenant,
	workspacesAfterRename
} from '@/core/lib/utils/settings-workspace';
import type { WorkspaceDateFormat, WorkspaceNumberFormat } from '@/core/lib/utils/workspace-formats';
import { queryKeys } from '@/core/query/keys';
import { organizationService, type TOrganizationChanges } from '@/core/services/client/api/organizations';
import { tenantService } from '@/core/services/client/api/tenants/tenant.service';
import { currentOrganizationState } from '@/core/stores/user/user-organizations';
import type { TOrganization } from '@/core/types/schemas';
import type { TWorkspace } from '@/core/types/schemas/team/organization-team.schema';

type WorkspaceChanges = Pick<TOrganizationChanges, 'name' | 'currency' | 'dateFormat' | 'numberFormat'>;

/**
 * The workspace a save belongs to, read when the save is asked: another tab may switch workspace before it runs. Its
 * token goes with the one write the API aims by the token alone, the tenant's name.
 */
interface SaveScope {
	tenantId: string;
	accessToken: string | null;
	organization: TOrganization;
	organizationKey: QueryKey;
	workspacesKey: QueryKey;
}

interface SaveText {
	failureKey: DottedLanguageObjectStringPaths;
	saved: string;
	outcome?: string;
}

interface FailureText {
	titleKey: DottedLanguageObjectStringPaths;
	descriptionKey: DottedLanguageObjectStringPaths;
}

/** What a failed save says: a rename that may have stopped halfway says how to finish it rather than why it stopped. */
function failureTextOf(error: unknown, failureKey: DottedLanguageObjectStringPaths): FailureText {
	if (error instanceof UnfinishedRenameError) {
		return {
			titleKey: 'settings.workspace.NAME_MAYBE_UNFINISHED',
			descriptionKey: 'settings.workspace.NAME_SAVE_AGAIN'
		};
	}
	const reasonKey = errorReasonKeyOf(error) as DottedLanguageObjectStringPaths;
	return { titleKey: failureKey, descriptionKey: reasonKey };
}

/** Whether a write went through. Its failure is not thrown: the caller says what it means. */
async function wentThrough(write: Promise<unknown>): Promise<boolean> {
	try {
		await write;
		return true;
	} catch {
		return false;
	}
}

/** The name the switcher shows is the tenant's; the organization's stands in when the list does not hold the tenant. */
function workspaceNameOf(workspace: TWorkspace | null, organization: TOrganization | null): string {
	if (workspace) {
		return workspace.user.tenant.name;
	}
	return organization?.name ?? '';
}

/**
 * The current workspace's name, currency and formats, who may change them, and their saves. A save says what it
 * changed, or why it failed, and a failed one throws so its control goes back to the stored value.
 */
export function useWorkspaceSettings() {
	const t = useTranslations();
	const queryClient = useQueryClient();
	const organizationRead = useGetCurrentOrganization({ enabled: true });
	const organization = useAtomValue(currentOrganizationState);
	const { workspaces, workspacesQuery } = useWorkspaces();
	const { data: user } = useUserQuery();
	const { myPermissions, isLoading: isPermissionsLoading } = useMyRolePermissionsQuery();
	const userId = user?.id;

	const workspace = workspaceOfTenant(workspaces, getTenantIdCookie());
	const name = workspaceNameOf(workspace, organization);

	const isWaitingForOrganization = organization === null;
	const isWaitingForWorkspace = workspace === null && !workspacesQuery.isSuccess;
	const isOrganizationReadFailed = isWaitingForOrganization && organizationRead.isError;
	const isWorkspaceReadFailed = workspace === null && workspacesQuery.isError;
	const isLoadFailed = isOrganizationReadFailed || isWorkspaceReadFailed;
	const isWaitingForRead = isWaitingForOrganization || isWaitingForWorkspace;
	const isWaitingForData = isWaitingForRead || isPermissionsLoading;
	const isLoading = !isLoadFailed && isWaitingForData;

	const retryOrganizationRead = organizationRead.refetch;
	const retryWorkspacesRead = workspacesQuery.refetch;
	const retryLoad = useCallback(() => {
		void retryOrganizationRead();
		void retryWorkspacesRead();
	}, [retryOrganizationRead, retryWorkspacesRead]);

	const scopeOfSave = useCallback((): SaveScope => {
		if (!organization) {
			throw new Error('No current organization');
		}
		const tenantId = getTenantIdCookie();
		const accessToken = getAccessTokenCookie();
		return {
			tenantId,
			accessToken,
			organization,
			organizationKey: queryKeys.workspaces.currentOrganizationByScope(tenantId, organization.id),
			workspacesKey: queryKeys.workspaces.byUser(userId)
		};
	}, [organization, userId]);

	// Gauzy takes the organization's name and currency with every change: two saves sent together would each write
	// back the value the other one is changing, so a save waits for the one before it.
	const lastSave = useRef<Promise<unknown>>(Promise.resolve());
	const inTurn = useCallback(<Saved>(save: () => Promise<Saved>): Promise<Saved> => {
		const turn = lastSave.current.then(save);
		lastSave.current = turn.catch(() => undefined);
		return turn;
	}, []);

	const saveOrganization = useCallback(
		async (scope: SaveScope, changes: WorkspaceChanges) => {
			const latest = queryClient.getQueryData<TOrganization>(scope.organizationKey) ?? scope.organization;
			const apiAnswer = await organizationService.updateOrganization(latest, changes);
			const afterSave = (cached: TOrganization | undefined): TOrganization => {
				const current = cached ?? latest;
				return organizationAfterSave(current, changes, apiAnswer);
			};
			queryClient.setQueryData<TOrganization>(scope.organizationKey, afterSave);
		},
		[queryClient]
	);

	const renameWorkspace = useCallback(
		async (scope: SaveScope, newName: string) => {
			const latest = queryClient.getQueryData<TOrganization>(scope.organizationKey) ?? scope.organization;
			const previousName = latest.name;
			const hasOrganizationThatName = previousName === newName;
			if (!hasOrganizationThatName) {
				await saveOrganization(scope, { name: newName });
			}
			try {
				// The tenant last: the name on this page and in the switcher changes once both are renamed
				await tenantService.renameTenant(newName, scope);
			} catch (error) {
				const tookTheName = !hasOrganizationThatName;
				let mayOrganizationKeepTheName = tookTheName;
				const shouldGiveNameBack = tookTheName && isRenameRefused(error);
				if (shouldGiveNameBack) {
					// Invitations show the organization's name: a refused rename must not leave it changed alone
					const isNameGivenBack = await wentThrough(saveOrganization(scope, { name: previousName }));
					mayOrganizationKeepTheName = !isNameGivenBack;
				}
				const mayBeUnfinished = isRenameMaybeUnfinished(error, mayOrganizationKeepTheName);
				if (mayBeUnfinished) {
					// Either name may hold the new one: both are read again, so the page shows what is stored
					void queryClient.invalidateQueries({ queryKey: scope.organizationKey });
					void queryClient.invalidateQueries({ queryKey: scope.workspacesKey });
					throw new UnfinishedRenameError(error);
				}
				throw error;
			}
			const renamed = (list: TWorkspace[] | undefined) => {
				if (!list) {
					return list;
				}
				return workspacesAfterRename(list, scope.tenantId, newName);
			};
			queryClient.setQueryData<TWorkspace[]>(scope.workspacesKey, renamed);
			void queryClient.invalidateQueries({ queryKey: scope.workspacesKey });
			// The forms that create a project or a team take the workspace's name from the signed-in user
			void queryClient.invalidateQueries({ queryKey: queryKeys.users.me });
		},
		[queryClient, saveOrganization]
	);

	const reportedSave = useCallback(
		async (save: () => Promise<void>, text: SaveText) => {
			try {
				await inTurn(save);
			} catch (error) {
				const failure = failureTextOf(error, text.failureKey);
				toast.error(t(failure.titleKey), { description: t(failure.descriptionKey) });
				throw error;
			}
			toast.success(text.saved, { description: text.outcome });
		},
		[inTurn, t]
	);

	const saveName = useCallback(
		async (newName: string) => {
			const scope = scopeOfSave();
			await reportedSave(() => renameWorkspace(scope, newName), {
				failureKey: 'settings.workspace.NAME_NOT_SAVED',
				saved: t('settings.workspace.NAME_SAVED', { name: newName })
			});
		},
		[renameWorkspace, reportedSave, scopeOfSave, t]
	);

	const saveCurrency = useCallback(
		async (currency: string) => {
			const scope = scopeOfSave();
			await reportedSave(() => saveOrganization(scope, { currency }), {
				failureKey: 'settings.workspace.CURRENCY_NOT_SAVED',
				saved: t('settings.workspace.CURRENCY_SAVED', { currency }),
				outcome: t('settings.workspace.CURRENCY_OUTCOME')
			});
		},
		[reportedSave, saveOrganization, scopeOfSave, t]
	);

	const saveDateFormat = useCallback(
		async (dateFormat: WorkspaceDateFormat | null) => {
			const scope = scopeOfSave();
			await reportedSave(() => saveOrganization(scope, { dateFormat }), {
				failureKey: 'settings.workspace.DATE_FORMAT_NOT_SAVED',
				saved: t('settings.workspace.DATE_FORMAT_SAVED'),
				outcome: t('settings.workspace.FORMAT_OUTCOME')
			});
		},
		[reportedSave, saveOrganization, scopeOfSave, t]
	);

	const saveNumberFormat = useCallback(
		async (numberFormat: WorkspaceNumberFormat | null) => {
			const scope = scopeOfSave();
			await reportedSave(() => saveOrganization(scope, { numberFormat }), {
				failureKey: 'settings.workspace.NUMBER_FORMAT_NOT_SAVED',
				saved: t('settings.workspace.NUMBER_FORMAT_SAVED'),
				outcome: t('settings.workspace.FORMAT_OUTCOME')
			});
		},
		[reportedSave, saveOrganization, scopeOfSave, t]
	);

	return {
		organization,
		name,
		canEdit: canEditWorkspace(myPermissions),
		canRename: canRenameWorkspace(user?.role?.name, myPermissions),
		isLoading,
		isLoadFailed,
		retryLoad,
		saveName,
		saveCurrency,
		saveDateFormat,
		saveNumberFormat
	};
}
