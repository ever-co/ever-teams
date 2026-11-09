'use client';

import { useState } from 'react';
import { useAtomValue } from 'jotai';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { Notice } from '@/core/components/common/notice';
import { Button } from '@/core/components/duplicated-components/_button';
import { NotificationTypeBadge } from '@/core/components/notifications/notification-type-badge';
import {
	SettingsPage,
	SettingsRow,
	SettingsSection,
	SettingsSurface
} from '@/core/components/settings/kit/settings-page';
import { SettingsSwitch } from '@/core/components/settings/kit/settings-switch';
import { isNotificationTypeOn, useNotificationSettings } from '@/core/hooks/notifications/use-notification-settings';
import {
	defaultEmailModeOf,
	digestHourOf,
	ownEmailModeOf,
	quietHoursOf
} from '@/core/lib/notifications/notification-preferences';
import { userState } from '@/core/stores/user/user';
import { useInboxWebPush } from '@/core/hooks/inbox/use-inbox-web-push';
import { isInboxEnabled } from '@/core/lib/utils/inbox-enabled';
import {
	EEmployeeNotificationType,
	IEmployeeNotificationSetting,
	INotificationPreferences,
	INotificationQuietHours,
	TEmployeeNotificationSettingKey
} from '@/core/types/interfaces/common/employee-notification';
import { DigestHourRow, EmailDefaultRow, EmailModeChoice, EmailModeSelect, QuietHoursRow } from './notification-channel-rows';
import { NotificationGroupsSkeleton } from './notifications-settings-skeleton';

interface TypeCopy {
	type: EEmployeeNotificationType;
	titleKey: `notifications.SETTINGS_PAGE.ROWS.${Uppercase<TEmployeeNotificationSettingKey>}.TITLE`;
	textKey: `notifications.SETTINGS_PAGE.ROWS.${Uppercase<TEmployeeNotificationSettingKey>}.TEXT`;
}

const TYPE_COPY = {
	assignment: {
		type: EEmployeeNotificationType.Assignment,
		titleKey: 'notifications.SETTINGS_PAGE.ROWS.ASSIGNMENT.TITLE',
		textKey: 'notifications.SETTINGS_PAGE.ROWS.ASSIGNMENT.TEXT'
	},
	mention: {
		type: EEmployeeNotificationType.Mention,
		titleKey: 'notifications.SETTINGS_PAGE.ROWS.MENTION.TITLE',
		textKey: 'notifications.SETTINGS_PAGE.ROWS.MENTION.TEXT'
	},
	comment: {
		type: EEmployeeNotificationType.Comment,
		titleKey: 'notifications.SETTINGS_PAGE.ROWS.COMMENT.TITLE',
		textKey: 'notifications.SETTINGS_PAGE.ROWS.COMMENT.TEXT'
	},
	invitation: {
		type: EEmployeeNotificationType.Invitation,
		titleKey: 'notifications.SETTINGS_PAGE.ROWS.INVITATION.TITLE',
		textKey: 'notifications.SETTINGS_PAGE.ROWS.INVITATION.TEXT'
	},
	message: {
		type: EEmployeeNotificationType.Message,
		titleKey: 'notifications.SETTINGS_PAGE.ROWS.MESSAGE.TITLE',
		textKey: 'notifications.SETTINGS_PAGE.ROWS.MESSAGE.TEXT'
	},
	payment: {
		type: EEmployeeNotificationType.Payment,
		titleKey: 'notifications.SETTINGS_PAGE.ROWS.PAYMENT.TITLE',
		textKey: 'notifications.SETTINGS_PAGE.ROWS.PAYMENT.TEXT'
	}
} as const satisfies Record<TEmployeeNotificationSettingKey, TypeCopy>;

/** Gauzy keeps one flag per notification type, with no channel. */
const WORK_TYPES: readonly TEmployeeNotificationSettingKey[] = ['assignment', 'mention', 'comment'];

const PEOPLE_TYPES: readonly TEmployeeNotificationSettingKey[] = ['invitation', 'message', 'payment'];

type PendingSwitches = Partial<Record<TEmployeeNotificationSettingKey, boolean>>;

function isTypeShownOn(
	setting: IEmployeeNotificationSetting | null,
	key: TEmployeeNotificationSettingKey,
	pending: PendingSwitches
): boolean {
	const pendingValue = pending[key];
	if (pendingValue !== undefined) {
		return pendingValue;
	}
	return isNotificationTypeOn(setting, key);
}

function withoutKey(pending: PendingSwitches, key: TEmployeeNotificationSettingKey): PendingSwitches {
	const next = { ...pending };
	delete next[key];
	return next;
}

type TypeRowsProps = {
	keys: readonly TEmployeeNotificationSettingKey[];
	setting: IEmployeeNotificationSetting | null;
	pending: PendingSwitches;
	isSavingPreferences: boolean;
	onToggle: (key: TEmployeeNotificationSettingKey, isOn: boolean) => void;
	onEmailMode: (type: EEmployeeNotificationType, mode: EmailModeChoice) => void;
};

function TypeRows({ keys, setting, pending, isSavingPreferences, onToggle, onEmailMode }: Readonly<TypeRowsProps>) {
	const t = useTranslations();
	return (
		<SettingsSurface>
			{keys.map((key) => {
				const copy = TYPE_COPY[key];
				const switchId = `notification-setting-${key}`;
				const isOn = isTypeShownOn(setting, key, pending);
				const isSaving = pending[key] !== undefined;
				return (
					<SettingsRow
						key={key}
						label={t(copy.titleKey)}
						description={t(copy.textKey)}
						leading={<NotificationTypeBadge type={copy.type} size="md" />}
						htmlFor={switchId}
						controlClassName="flex-wrap"
					>
						{isOn && (
							<EmailModeSelect
								value={ownEmailModeOf(setting?.preferences, copy.type) ?? 'default'}
								allowDefault
								disabled={isSavingPreferences}
								ariaLabel={`${t('notifications.SETTINGS_PAGE.CHANNELS.MODE_LABEL')}: ${t(copy.titleKey)}`}
								className="w-full sm:w-40"
								onChange={(mode) => onEmailMode(copy.type, mode)}
							/>
						)}
						<SettingsSwitch
							id={switchId}
							checked={isOn}
							pending={isSaving}
							onCheckedChange={(next) => onToggle(key, next)}
						/>
					</SettingsRow>
				);
			})}
		</SettingsSurface>
	);
}

export function NotificationsSettingsPage() {
	const t = useTranslations();
	const user = useAtomValue(userState);
	const { setting, isAvailable, isLoading, isError, retry, toggle, savePreferences, isSavingPreferences } = useNotificationSettings();
	const [pending, setPending] = useState<PendingSwitches>({});
	const isUserKnown = Boolean(user);
	const showsSkeleton = !isUserKnown || isLoading;
	const showsUnavailable = isUserKnown && !isAvailable;
	const isSettled = !isLoading && !isError;
	const showsRows = isAvailable && isSettled;

	const onToggle = async (key: TEmployeeNotificationSettingKey, isOn: boolean) => {
		const hasRow = Boolean(setting?.id);
		const isAnySaving = Object.keys(pending).length > 0;
		// Without a row each save is a POST: a second one before the first answers would create a second row
		const waitsForRow = !hasRow && isAnySaving;
		if (waitsForRow) {
			return;
		}
		setPending((current) => ({ ...current, [key]: isOn }));
		try {
			await toggle({ key, isOn });
		} catch {
			const message = t('notifications.SETTINGS_PAGE.SAVE_FAILED');
			toast.error(message);
		} finally {
			setPending((current) => withoutKey(current, key));
		}
	};

	const onPreferences = async (patch: Partial<INotificationPreferences>) => {
		try {
			await savePreferences(patch);
		} catch {
			toast.error(t('notifications.SETTINGS_PAGE.CHANNELS.SAVE_FAILED'));
		}
	};
	// `default` takes the kind's own choice away, so it follows the mode of every kind again.
	const onEmailMode = (type: EEmployeeNotificationType, mode: EmailModeChoice) =>
		onPreferences({ emailByType: { [type]: mode === 'default' ? undefined : mode } });
	const onQuietHours = (window: INotificationQuietHours | null) => onPreferences({ dnd: window });
	const preferences = setting?.preferences;
	const quietHours = quietHoursOf(preferences);
	const quietHoursKey = quietHours ? `${quietHours.start}-${quietHours.end}` : 'off';

	return (
		<SettingsPage
			title={t('settings.entries.notifications.TITLE')}
			description={t('settings.entries.notifications.DESCRIPTION')}
		>
			{showsSkeleton && <NotificationGroupsSkeleton />}
			{showsUnavailable && (
				<Notice
					tone="info"
					title={t('settings.notifications.UNAVAILABLE_TITLE')}
					description={t('settings.notifications.UNAVAILABLE_TEXT')}
				/>
			)}
			{isError && (
				<Notice
					tone="error"
					title={t('notifications.SETTINGS_PAGE.LOAD_ERROR')}
					description={t('settings.notifications.LOAD_ERROR_TEXT')}
					actions={
						<Button type="button" variant="outline" size="sm" onClick={() => retry()}>
							{t('notifications.RETRY')}
						</Button>
					}
				/>
			)}
			{showsRows && (
				<>
					<SettingsSection
						id="notifications"
						title={t('settings.notifications.GROUP_WORK')}
						description={t('notifications.SETTINGS_PAGE.INTRO')}
					>
						<TypeRows
							keys={WORK_TYPES}
							setting={setting}
							pending={pending}
							isSavingPreferences={isSavingPreferences}
							onToggle={onToggle}
							onEmailMode={onEmailMode}
						/>
					</SettingsSection>
					<SettingsSection title={t('settings.notifications.GROUP_PEOPLE')}>
						<TypeRows
							keys={PEOPLE_TYPES}
							setting={setting}
							pending={pending}
							isSavingPreferences={isSavingPreferences}
							onToggle={onToggle}
							onEmailMode={onEmailMode}
						/>
					</SettingsSection>
					<SettingsSection
						id="notification-email"
						title={t('notifications.SETTINGS_PAGE.CHANNELS.EMAIL_TITLE')}
						description={t('notifications.SETTINGS_PAGE.CHANNELS.EMAIL_INTRO')}
					>
						<EmailDefaultRow
							value={defaultEmailModeOf(preferences)}
							disabled={isSavingPreferences}
							onChange={(mode) => onPreferences({ email: mode })}
						/>
					</SettingsSection>
					<BrowserPushSection />
					<SettingsSection id="notification-quiet-hours" title={t('notifications.SETTINGS_PAGE.CHANNELS.QUIET_TITLE')}>
						<SettingsSurface>
							<QuietHoursRow key={quietHoursKey} window={quietHours} disabled={isSavingPreferences} onChange={onQuietHours} />
							<DigestHourRow
								value={digestHourOf(preferences)}
								disabled={isSavingPreferences}
								onChange={(hour) => onPreferences({ digestHour: hour })}
							/>
						</SettingsSurface>
					</SettingsSection>
				</>
			)}
		</SettingsPage>
	);
}

/**
 * Browser notifications on this device (web push): shown where the deployment has the Inbox and the platform has
 * web push on; the switch subscribes this browser, or removes it.
 */
function BrowserPushSection() {
	const t = useTranslations();
	const push = useInboxWebPush(isInboxEnabled());
	if (push.state === 'unavailable' || push.state === 'loading') return null;

	let description = t('notifications.SETTINGS_PAGE.CHANNELS.PUSH_OFF');
	if (push.state === 'on') description = t('notifications.SETTINGS_PAGE.CHANNELS.PUSH_ON');
	if (push.state === 'blocked') description = t('notifications.SETTINGS_PAGE.CHANNELS.PUSH_BLOCKED');
	if (push.state === 'unsupported') description = t('notifications.SETTINGS_PAGE.CHANNELS.PUSH_UNSUPPORTED');
	const canSwitch = push.state === 'on' || push.state === 'off';

	const onChange = async (isOn: boolean) => {
		try {
			if (isOn) await push.enable();
			else await push.disable();
		} catch {
			toast.error(t('notifications.SETTINGS_PAGE.CHANNELS.PUSH_FAILED'));
		}
	};

	return (
		<SettingsSection
			id="notification-push"
			title={t('notifications.SETTINGS_PAGE.CHANNELS.PUSH_TITLE')}
			description={t('notifications.SETTINGS_PAGE.CHANNELS.PUSH_INTRO')}
		>
			<SettingsSurface>
				<SettingsRow label={t('notifications.SETTINGS_PAGE.CHANNELS.PUSH_LABEL')} description={description} htmlFor="notification-push-switch">
					<SettingsSwitch
						id="notification-push-switch"
						checked={push.state === 'on'}
						onCheckedChange={(isOn) => void onChange(isOn)}
						ariaLabel={t('notifications.SETTINGS_PAGE.CHANNELS.PUSH_LABEL')}
						disabled={!canSwitch}
						pending={push.busy}
					/>
				</SettingsRow>
			</SettingsSurface>
		</SettingsSection>
	);
}
