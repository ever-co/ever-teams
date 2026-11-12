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
import { useInboxDeliveryStatus } from '@/core/hooks/inbox/use-inbox-delivery-status';
import { isNotificationTypeOn, useNotificationSettings } from '@/core/hooks/notifications/use-notification-settings';
import {
	defaultEmailModeOf,
	digestHourOf,
	emailDeliveryNoticeOf,
	ownEmailModeOf,
	quietHoursOf
} from '@/core/lib/notifications/notification-preferences';
import { timerReminderHoursOf } from '@/core/lib/notifications/timer-reminders';
import { userState } from '@/core/stores/user/user';
import {
	EEmployeeNotificationType,
	IEmployeeNotificationSetting,
	INotificationPreferences,
	INotificationQuietHours,
	TEmployeeNotificationSettingKey
} from '@/core/types/interfaces/common/employee-notification';
import { DigestHourRow, EmailDefaultRow, EmailModeChoice, EmailModeSelect, QuietHoursRow } from './notification-channel-rows';
import { BrowserPushSection, SoundSection } from './notification-push-section';
import { TYPE_COPY } from './notification-type-copy';
import { NotificationGroupsSkeleton } from './notifications-settings-skeleton';
import { TimerReminderRow } from './timer-reminder-row';

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
	// The choices stay editable and are kept: the notice only says why no email arrives for now.
	const emailNotice = emailDeliveryNoticeOf(useInboxDeliveryStatus());
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
	const timerReminderHours = timerReminderHoursOf(preferences);
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
						id="notification-time-tracking"
						title={t('notifications.SETTINGS_PAGE.TIMER.TITLE')}
						description={t('notifications.SETTINGS_PAGE.TIMER.INTRO')}
					>
						<SettingsSurface>
							<TimerReminderRow
								value={timerReminderHours}
								disabled={isSavingPreferences}
								onChange={(hours) => onPreferences({ timerReminderHours: hours })}
								emailMode={
									ownEmailModeOf(preferences, EEmployeeNotificationType.TimerReminder) ?? 'default'
								}
								onEmailMode={(mode) => onEmailMode(EEmployeeNotificationType.TimerReminder, mode)}
							/>
						</SettingsSurface>
					</SettingsSection>
					<SettingsSection
						id="notification-email"
						title={t('notifications.SETTINGS_PAGE.CHANNELS.EMAIL_TITLE')}
						description={t('notifications.SETTINGS_PAGE.CHANNELS.EMAIL_INTRO')}
					>
						{emailNotice === 'off' && (
							<Notice
								tone="warning"
								title={t('notifications.SETTINGS_PAGE.CHANNELS.EMAIL_OFF_TITLE')}
								description={t('notifications.SETTINGS_PAGE.CHANNELS.EMAIL_OFF_TEXT')}
							/>
						)}
						{emailNotice === 'unavailable' && (
							<Notice
								tone="warning"
								title={t('notifications.SETTINGS_PAGE.CHANNELS.EMAIL_UNAVAILABLE_TITLE')}
								description={t('notifications.SETTINGS_PAGE.CHANNELS.EMAIL_UNAVAILABLE_TEXT')}
							/>
						)}
						<EmailDefaultRow
							value={defaultEmailModeOf(preferences)}
							disabled={isSavingPreferences}
							onChange={(mode) => onPreferences({ email: mode })}
						/>
					</SettingsSection>
					<BrowserPushSection
						isKindOn={(key) => isTypeShownOn(setting, key, pending)}
						isTimerReminderOn={timerReminderHours !== null}
						preferences={preferences}
						isSavingPreferences={isSavingPreferences}
						onPreferences={onPreferences}
					/>
					<SoundSection />
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
