'use client';

import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import { employeeNotificationSettingService, INotificationInboxScope } from '@/core/services/client/api/notifications';
import { withPreferencePatch } from '@/core/lib/notifications/notification-preferences';
import {
	IEmployeeNotificationSetting,
	INotificationPreferences,
	TEmployeeNotificationSettingInput,
	TEmployeeNotificationSettingKey
} from '@/core/types/interfaces/common/employee-notification';
import { useNotificationScope } from './use-notification-scope';

/** The types Ever Teams users actually receive first, then the rarer ones. */
export const NOTIFICATION_SETTING_KEYS: readonly TEmployeeNotificationSettingKey[] = [
	'assignment',
	'mention',
	'comment',
	'invitation',
	'message',
	'payment'
];

async function fetchSetting(
	scope: INotificationInboxScope | null,
	signal: AbortSignal
): Promise<IEmployeeNotificationSetting | null> {
	if (!scope) {
		return null;
	}

	return employeeNotificationSettingService.getForEmployee(scope, scope.receiverEmployeeId, signal);
}

/** Gauzy files every type unless the employee's row turns it off; a missing row or value means on. */
export function isNotificationTypeOn(
	setting: IEmployeeNotificationSetting | null | undefined,
	key: TEmployeeNotificationSettingKey
): boolean {
	return setting?.[key] !== false;
}

interface ToggleVariables {
	key: TEmployeeNotificationSettingKey;
	isOn: boolean;
}

function withSwitch(
	setting: IEmployeeNotificationSetting | null | undefined,
	variables: ToggleVariables
): IEmployeeNotificationSetting | null {
	if (!setting) {
		return null;
	}

	return { ...setting, [variables.key]: variables.isOn };
}

/** The setting with a preferences patch applied (for the cache, before Gauzy answers). */
function withPreferences(
	setting: IEmployeeNotificationSetting | null | undefined,
	patch: Partial<INotificationPreferences>
): IEmployeeNotificationSetting | null {
	if (!setting) {
		return null;
	}

	return { ...setting, preferences: withPreferencePatch(setting.preferences, patch) };
}

function pendingKeyOf(
	isPending: boolean,
	variables: ToggleVariables | undefined
): TEmployeeNotificationSettingKey | undefined {
	if (!isPending) {
		return undefined;
	}

	return variables?.key;
}

export function useNotificationSettings() {
	const scope = useNotificationScope();
	const queryClient = useQueryClient();
	const settingsKey = queryKeys.notifications.settings(
		scope?.tenantId,
		scope?.organizationId,
		scope?.receiverEmployeeId
	);

	const settingQuery = useQuery({
		queryKey: settingsKey,
		queryFn: ({ signal }) => fetchSetting(scope, signal),
		enabled: scope !== null
	});

	const saveSwitch = useCallback(
		async ({ key, isOn }: ToggleVariables) => {
			if (!scope) {
				return null;
			}
			const current = queryClient.getQueryData<IEmployeeNotificationSetting | null>(settingsKey);
			const input: TEmployeeNotificationSettingInput = {};
			input[key] = isOn;
			if (current?.id) {
				return employeeNotificationSettingService.update(current.id, scope, input);
			}

			return employeeNotificationSettingService.create(scope, input);
		},
		[queryClient, scope, settingsKey]
	);

	const toggleMutation = useMutation({
		mutationFn: saveSwitch,
		onMutate: async (variables: ToggleVariables) => {
			await queryClient.cancelQueries({ queryKey: settingsKey });
			const previous = queryClient.getQueryData<IEmployeeNotificationSetting | null>(settingsKey);
			queryClient.setQueryData(settingsKey, withSwitch(previous, variables));

			return previous;
		},
		onSuccess: (saved) => {
			if (saved) {
				queryClient.setQueryData(settingsKey, saved);
			}
		},
		onError: (_error, _variables, previous) => {
			queryClient.setQueryData(settingsKey, previous);
		}
	});

	const savePreferencePatch = useCallback(
		async (patch: Partial<INotificationPreferences>) => {
			if (!scope) {
				return null;
			}
			const current = queryClient.getQueryData<IEmployeeNotificationSetting | null>(settingsKey);
			const input = { preferences: withPreferencePatch(current?.preferences, patch) };
			if (current?.id) {
				return employeeNotificationSettingService.update(current.id, scope, input);
			}

			return employeeNotificationSettingService.create(scope, input);
		},
		[queryClient, scope, settingsKey]
	);

	const preferencesMutation = useMutation({
		mutationFn: savePreferencePatch,
		onMutate: async (patch: Partial<INotificationPreferences>) => {
			await queryClient.cancelQueries({ queryKey: settingsKey });
			const previous = queryClient.getQueryData<IEmployeeNotificationSetting | null>(settingsKey);
			queryClient.setQueryData(settingsKey, withPreferences(previous, patch));

			return previous;
		},
		onSuccess: (saved) => {
			if (saved) {
				queryClient.setQueryData(settingsKey, saved);
			}
		},
		onError: (_error, _patch, previous) => {
			queryClient.setQueryData(settingsKey, previous);
		}
	});

	return {
		setting: settingQuery.data ?? null,
		isAvailable: scope !== null,
		isLoading: settingQuery.isPending && settingQuery.fetchStatus !== 'idle',
		isError: settingQuery.isError,
		retry: settingQuery.refetch,
		toggle: toggleMutation.mutateAsync,
		pendingKey: pendingKeyOf(toggleMutation.isPending, toggleMutation.variables),
		/** Saves a change of the delivery preferences (email modes, quiet hours, digest hour). */
		savePreferences: preferencesMutation.mutateAsync,
		isSavingPreferences: preferencesMutation.isPending
	};
}
