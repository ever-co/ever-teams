'use client';

import { useCallback, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import { withPreferencePatch } from '@/core/lib/notifications/notification-preferences';
import { employeeNotificationSettingService, INotificationInboxScope } from '@/core/services/client/api/notifications';
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

/** One change of the setting: a type's switch, or a patch of the delivery preferences. */
export type NotificationSettingSave =
	| { kind: 'switch'; key: TEmployeeNotificationSettingKey; isOn: boolean }
	| { kind: 'preferences'; patch: Partial<INotificationPreferences> };

/** The setting with one save applied (what the cache shows before Gauzy answers). */
export function withSave(
	setting: IEmployeeNotificationSetting | null | undefined,
	save: NotificationSettingSave
): IEmployeeNotificationSetting | null {
	if (!setting) {
		return null;
	}
	if (save.kind === 'switch') {
		return { ...setting, [save.key]: save.isOn };
	}

	return { ...setting, preferences: withPreferencePatch(setting.preferences, save.patch) };
}

/** The setting with only the fields of a refused save put back as they were — the other saves' changes stay. */
export function withSaveReverted(
	setting: IEmployeeNotificationSetting | null | undefined,
	save: NotificationSettingSave,
	previous: IEmployeeNotificationSetting | null | undefined
): IEmployeeNotificationSetting | null {
	if (!setting) {
		return previous ?? null;
	}
	if (save.kind === 'switch') {
		return { ...setting, [save.key]: previous?.[save.key] };
	}

	return { ...setting, preferences: previous?.preferences ?? null };
}

function pendingKeyOf(saves: readonly NotificationSettingSave[]): TEmployeeNotificationSettingKey | undefined {
	const last = saves.filter((save) => save.kind === 'switch').at(-1);

	return last?.kind === 'switch' ? last.key : undefined;
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

	// The saves run one after the other: a save reads the row as the one before it left it (so a second save never
	// creates a second row), and the saves still in flight are re-applied over every answer Gauzy gives.
	const queueRef = useRef<Promise<unknown>>(Promise.resolve());
	const inFlightRef = useRef<NotificationSettingSave[]>([]);
	const [inFlight, setInFlight] = useState<readonly NotificationSettingSave[]>([]);

	const sendSave = useCallback(
		async (save: NotificationSettingSave) => {
			if (!scope) {
				return null;
			}
			const current = queryClient.getQueryData<IEmployeeNotificationSetting | null>(settingsKey);
			const input: TEmployeeNotificationSettingInput = {};
			if (save.kind === 'switch') {
				input[save.key] = save.isOn;
			} else {
				input.preferences = withPreferencePatch(current?.preferences, save.patch);
			}
			if (current?.id) {
				return employeeNotificationSettingService.update(current.id, scope, input);
			}

			return employeeNotificationSettingService.create(scope, input);
		},
		[queryClient, scope, settingsKey]
	);

	const saveMutation = useMutation({
		mutationFn: (save: NotificationSettingSave) => {
			const run = () => sendSave(save);
			const next = queueRef.current.then(run, run);
			queueRef.current = next.catch(() => undefined);

			return next;
		},
		onMutate: async (save: NotificationSettingSave) => {
			inFlightRef.current = [...inFlightRef.current, save];
			setInFlight(inFlightRef.current);
			await queryClient.cancelQueries({ queryKey: settingsKey });
			const previous = queryClient.getQueryData<IEmployeeNotificationSetting | null>(settingsKey);
			queryClient.setQueryData(settingsKey, withSave(previous, save));

			return previous;
		},
		onSuccess: (saved, save) => {
			if (!saved) {
				return;
			}
			// Gauzy's row, with the saves still in flight (queued after this one) applied over it again.
			const pending = inFlightRef.current.filter((other) => other !== save);
			queryClient.setQueryData(settingsKey, pending.reduce<IEmployeeNotificationSetting | null>(withSave, saved));
		},
		onError: (_error, save, previous) => {
			const current = queryClient.getQueryData<IEmployeeNotificationSetting | null>(settingsKey);
			queryClient.setQueryData(settingsKey, withSaveReverted(current, save, previous));
		},
		onSettled: (_saved, _error, save) => {
			inFlightRef.current = inFlightRef.current.filter((other) => other !== save);
			setInFlight(inFlightRef.current);
		}
	});

	const toggle = useCallback(
		({ key, isOn }: ToggleVariables) => saveMutation.mutateAsync({ kind: 'switch', key, isOn }),
		[saveMutation]
	);
	const savePreferences = useCallback(
		(patch: Partial<INotificationPreferences>) => saveMutation.mutateAsync({ kind: 'preferences', patch }),
		[saveMutation]
	);

	return {
		setting: settingQuery.data ?? null,
		isAvailable: scope !== null,
		isLoading: settingQuery.isPending && settingQuery.fetchStatus !== 'idle',
		isError: settingQuery.isError,
		retry: settingQuery.refetch,
		toggle,
		pendingKey: pendingKeyOf(inFlight),
		/** Saves a change of the delivery preferences (email modes, quiet hours, digest hour). */
		savePreferences,
		isSavingPreferences: inFlight.some((save) => save.kind === 'preferences')
	};
}
