'use client';

import { toast } from 'sonner';
import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/core/components/duplicated-components/_button';
import { NotificationTypeBadge } from '@/core/components/notifications/notification-type-badge';
import { SettingsRow, SettingsSection, SettingsSurface } from '@/core/components/settings/kit/settings-page';
import { SettingsSwitch } from '@/core/components/settings/kit/settings-switch';
import { useInboxSound } from '@/core/hooks/inbox/use-inbox-alerts';
import { useInboxWebPush } from '@/core/hooks/inbox/use-inbox-web-push';
import { NOTIFICATION_SETTING_KEYS } from '@/core/hooks/notifications/use-notification-settings';
import { pushOnFor } from '@/core/lib/notifications/notification-preferences';
import { isRealtimeEnabled } from '@/core/lib/realtime/config';
import { isInboxEnabled } from '@/core/lib/utils/inbox-enabled';
import { formatNotificationDate } from '@/core/lib/utils/notification-inbox';
import { pushDeviceNameOf } from '@/core/lib/utils/web-push';
import type { IInboxPushDevice } from '@/core/services/client/api/inbox';
import {
	EEmployeeNotificationType,
	type INotificationPreferences,
	type TEmployeeNotificationSettingKey
} from '@/core/types/interfaces/common/employee-notification';
import { TYPE_COPY } from './notification-type-copy';

const SUBHEADING = 'px-1 pt-2 text-xs font-medium text-muted-foreground';

type BrowserPushSectionProps = {
	/** Whether a kind is filed at all (its switch above): a kind that is off is never pushed either. */
	isKindOn: (key: TEmployeeNotificationSettingKey) => boolean;
	/** Whether the timer reminders are on (their threshold in Time tracking, above). */
	isTimerReminderOn: boolean;
	preferences: INotificationPreferences | null | undefined;
	isSavingPreferences: boolean;
	onPreferences: (patch: Partial<INotificationPreferences>) => void;
};

/**
 * Browser notifications (web push): shown where the deployment has the Inbox and the platform has web push on. The
 * switch subscribes this browser, or removes it; once a device is registered, the kinds sent to the devices and the
 * devices themselves are listed, each device with a remove action.
 */
export function BrowserPushSection({
	isKindOn,
	isTimerReminderOn,
	preferences,
	isSavingPreferences,
	onPreferences
}: Readonly<BrowserPushSectionProps>) {
	const t = useTranslations();
	const push = useInboxWebPush(isInboxEnabled());
	if (push.state === 'unavailable' || push.state === 'loading') return null;

	let description = t('notifications.SETTINGS_PAGE.CHANNELS.PUSH_OFF');
	if (push.state === 'on') description = t('notifications.SETTINGS_PAGE.CHANNELS.PUSH_ON');
	if (push.state === 'blocked') description = t('notifications.SETTINGS_PAGE.CHANNELS.PUSH_BLOCKED');
	if (push.state === 'unsupported') description = t('notifications.SETTINGS_PAGE.CHANNELS.PUSH_UNSUPPORTED');
	const canSwitch = push.state === 'on' || push.state === 'off';
	const hasDevices = push.state === 'on' || push.devices.length > 0;

	const onChange = async (isOn: boolean) => {
		try {
			if (isOn) await push.enable();
			else await push.disable();
		} catch {
			toast.error(t('notifications.SETTINGS_PAGE.CHANNELS.PUSH_FAILED'));
		}
	};

	const onRemove = async (device: IInboxPushDevice) => {
		try {
			await push.removeDevice(device);
		} catch {
			toast.error(t('notifications.SETTINGS_PAGE.CHANNELS.DEVICE_REMOVE_FAILED'));
		}
	};

	return (
		<SettingsSection
			id="notification-push"
			title={t('notifications.SETTINGS_PAGE.CHANNELS.PUSH_TITLE')}
			description={t('notifications.SETTINGS_PAGE.CHANNELS.PUSH_INTRO')}
		>
			<SettingsSurface>
				<SettingsRow
					label={t('notifications.SETTINGS_PAGE.CHANNELS.PUSH_LABEL')}
					description={description}
					htmlFor="notification-push-switch"
				>
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
			{hasDevices && (
				<PushKindRows
					isKindOn={isKindOn}
					isTimerReminderOn={isTimerReminderOn}
					preferences={preferences}
					disabled={isSavingPreferences}
					onPreferences={onPreferences}
				/>
			)}
			{push.devices.length > 0 && (
				<PushDeviceRows
					devices={push.devices}
					thisEndpoint={push.thisEndpoint}
					busy={push.busy}
					onRemove={(device) => void onRemove(device)}
				/>
			)}
		</SettingsSection>
	);
}

type PushKindRowsProps = {
	isKindOn: (key: TEmployeeNotificationSettingKey) => boolean;
	isTimerReminderOn: boolean;
	preferences: INotificationPreferences | null | undefined;
	disabled: boolean;
	onPreferences: (patch: Partial<INotificationPreferences>) => void;
};

/**
 * Which kinds reach the devices: one switch per kind, saved as the kind's own choice. The timer reminders are the last
 * kind: their threshold, in Time tracking, is what turns them on or off.
 */
function PushKindRows({
	isKindOn,
	isTimerReminderOn,
	preferences,
	disabled,
	onPreferences
}: Readonly<PushKindRowsProps>) {
	const t = useTranslations();
	const timerLabel = t('notifications.SETTINGS_PAGE.TIMER.LABEL');
	const timerSwitchId = 'notification-push-timer-reminder';
	return (
		<>
			<h3 className={SUBHEADING}>{t('notifications.SETTINGS_PAGE.CHANNELS.PUSH_KINDS_TITLE')}</h3>
			<SettingsSurface>
				{NOTIFICATION_SETTING_KEYS.map((key) => {
					const copy = TYPE_COPY[key];
					const switchId = `notification-push-${key}`;
					const isFiled = isKindOn(key);
					return (
						<SettingsRow
							key={key}
							label={t(copy.titleKey)}
							description={isFiled ? undefined : t('notifications.SETTINGS_PAGE.CHANNELS.PUSH_KIND_OFF')}
							leading={<NotificationTypeBadge type={copy.type} size="md" />}
							htmlFor={switchId}
						>
							<SettingsSwitch
								id={switchId}
								checked={isFiled && pushOnFor(preferences, copy.type)}
								disabled={!isFiled}
								pending={disabled}
								ariaLabel={`${t('notifications.SETTINGS_PAGE.CHANNELS.PUSH_TITLE')}: ${t(copy.titleKey)}`}
								onCheckedChange={(isOn) => onPreferences({ pushByType: { [copy.type]: isOn } })}
							/>
						</SettingsRow>
					);
				})}
				<SettingsRow
					label={timerLabel}
					description={
						isTimerReminderOn ? undefined : t('notifications.SETTINGS_PAGE.CHANNELS.PUSH_KIND_OFF')
					}
					leading={<NotificationTypeBadge type={EEmployeeNotificationType.TimerReminder} size="md" />}
					htmlFor={timerSwitchId}
				>
					<SettingsSwitch
						id={timerSwitchId}
						checked={isTimerReminderOn && pushOnFor(preferences, EEmployeeNotificationType.TimerReminder)}
						disabled={!isTimerReminderOn}
						pending={disabled}
						ariaLabel={`${t('notifications.SETTINGS_PAGE.CHANNELS.PUSH_TITLE')}: ${timerLabel}`}
						onCheckedChange={(isOn) =>
							onPreferences({ pushByType: { [EEmployeeNotificationType.TimerReminder]: isOn } })
						}
					/>
				</SettingsRow>
			</SettingsSurface>
		</>
	);
}

type PushDeviceRowsProps = {
	devices: readonly IInboxPushDevice[];
	thisEndpoint: string | null;
	busy: boolean;
	onRemove: (device: IInboxPushDevice) => void;
};

/** The person's devices that receive browser notifications, this one marked, each with a remove action. */
function PushDeviceRows({ devices, thisEndpoint, busy, onRemove }: Readonly<PushDeviceRowsProps>) {
	const t = useTranslations();
	const locale = useLocale();

	const nameOf = (device: IInboxPushDevice) => {
		const { browser, system } = pushDeviceNameOf(device.userAgent);
		const browserName = browser ?? t('notifications.SETTINGS_PAGE.CHANNELS.DEVICE_UNKNOWN');
		return system
			? t('notifications.SETTINGS_PAGE.CHANNELS.DEVICE_NAME', { browser: browserName, system })
			: browserName;
	};
	const whenOf = (device: IInboxPushDevice) => {
		const lastUsed = device.lastUsedAt ? new Date(device.lastUsedAt) : null;
		if (lastUsed && Number.isFinite(lastUsed.getTime())) {
			return t('notifications.SETTINGS_PAGE.CHANNELS.DEVICE_LAST_USED', {
				date: formatNotificationDate(lastUsed, locale)
			});
		}
		const added = device.createdAt ? new Date(device.createdAt) : null;
		if (added && Number.isFinite(added.getTime())) {
			return t('notifications.SETTINGS_PAGE.CHANNELS.DEVICE_ADDED', {
				date: formatNotificationDate(added, locale)
			});
		}
		return undefined;
	};

	return (
		<>
			<h3 className={SUBHEADING}>{t('notifications.SETTINGS_PAGE.CHANNELS.DEVICES_TITLE')}</h3>
			<SettingsSurface>
				{devices.map((device) => {
					const name = nameOf(device);
					const isThis = !!thisEndpoint && device.endpoint === thisEndpoint;
					return (
						<SettingsRow
							key={device.id}
							label={
								<span className="flex flex-wrap items-center gap-2">
									{name}
									{isThis && (
										<span className="rounded-full bg-primary/10 px-2 py-px text-[11px] font-medium text-primary">
											{t('notifications.SETTINGS_PAGE.CHANNELS.DEVICE_THIS')}
										</span>
									)}
								</span>
							}
							description={whenOf(device)}
						>
							<Button
								type="button"
								variant="outline"
								size="sm"
								disabled={busy}
								aria-label={`${t('notifications.SETTINGS_PAGE.CHANNELS.DEVICE_REMOVE')}: ${name}`}
								onClick={() => onRemove(device)}
							>
								{t('notifications.SETTINGS_PAGE.CHANNELS.DEVICE_REMOVE')}
							</Button>
						</SettingsRow>
					);
				})}
			</SettingsSurface>
		</>
	);
}

/**
 * The sound of a new entry in this browser (one open tab plays it): shown where the deployment has the Inbox and the
 * live channel that brings new entries as they arrive.
 */
export function SoundSection() {
	const t = useTranslations();
	const [isOn, setOn] = useInboxSound();
	if (!isInboxEnabled() || !isRealtimeEnabled()) return null;
	return (
		<SettingsSection id="notification-sound" title={t('notifications.SETTINGS_PAGE.CHANNELS.SOUND_TITLE')}>
			<SettingsSurface>
				<SettingsRow
					label={t('notifications.SETTINGS_PAGE.CHANNELS.SOUND_LABEL')}
					description={t('notifications.SETTINGS_PAGE.CHANNELS.SOUND_TEXT')}
					htmlFor="notification-sound-switch"
				>
					<SettingsSwitch id="notification-sound-switch" checked={isOn} onCheckedChange={setOn} />
				</SettingsRow>
			</SettingsSurface>
		</SettingsSection>
	);
}
