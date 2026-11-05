'use client';

import { Switch } from '@headlessui/react';
import { type DottedLanguageObjectStringPaths, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Button } from '@/core/components/duplicated-components/_button';
import { SWITCH_THUMB_RECIPE, SWITCH_TRACK_RECIPE } from '@/core/components/common/switch';
import { NotificationTypeBadge } from '@/core/components/notifications/notification-type-badge';
import {
	isNotificationTypeOn,
	NOTIFICATION_SETTING_KEYS,
	useNotificationSettings
} from '@/core/hooks/notifications/use-notification-settings';
import {
	EEmployeeNotificationType,
	IEmployeeNotificationSetting,
	TEmployeeNotificationSettingKey
} from '@/core/types/interfaces/common/employee-notification';

interface SettingRowCopy {
	type: EEmployeeNotificationType;
	titleKey: DottedLanguageObjectStringPaths;
	textKey: DottedLanguageObjectStringPaths;
}

const ROW_COPY: Record<TEmployeeNotificationSettingKey, SettingRowCopy> = {
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
};

const LIST_SURFACE_CLASS =
	'flex flex-col rounded-xl bg-card hairline-ring ring-border shadow-sm shadow-black/6.5 hairline-divide-y divide-border';

function SettingsRowsSkeleton() {
	return (
		<div aria-hidden="true" className={LIST_SURFACE_CLASS}>
			{NOTIFICATION_SETTING_KEYS.map((key) => (
				<div key={key} className="flex items-center gap-3 px-4 py-3">
					<span className="size-6 shrink-0 animate-pulse rounded-full bg-foreground/[0.06]" />
					<div className="flex min-w-0 flex-1 flex-col gap-2">
						<span className="h-2.5 w-28 animate-pulse rounded-full bg-foreground/[0.07]" />
						<span className="h-2 w-56 max-w-full animate-pulse rounded-full bg-foreground/[0.05]" />
					</div>
					<span className="h-6 w-10.5 shrink-0 animate-pulse rounded-full bg-foreground/[0.06]" />
				</div>
			))}
		</div>
	);
}

function NotificationSettingsIntro() {
	const t = useTranslations();
	return (
		<p className="max-w-xl text-sm text-muted-foreground text-pretty">{t('notifications.SETTINGS_PAGE.INTRO')}</p>
	);
}

export function NotificationSettingsSkeleton() {
	return (
		<div className="flex flex-col gap-4">
			<NotificationSettingsIntro />
			<SettingsRowsSkeleton />
		</div>
	);
}

function SettingRow({
	settingKey,
	setting,
	isSaving,
	onToggle
}: Readonly<{
	settingKey: TEmployeeNotificationSettingKey;
	setting: IEmployeeNotificationSetting | null;
	isSaving: boolean;
	onToggle: (key: TEmployeeNotificationSettingKey, isOn: boolean) => void;
}>) {
	const t = useTranslations();
	const copy = ROW_COPY[settingKey];
	const isOn = isNotificationTypeOn(setting, settingKey);
	const titleId = `notification-setting-${settingKey}`;

	return (
		<div className="flex items-center gap-3 px-4 py-3">
			<NotificationTypeBadge type={copy.type} size="md" />
			<div className="flex min-w-0 flex-1 flex-col gap-0.5">
				<span id={titleId} className="text-[13px] font-medium text-foreground">
					{t(copy.titleKey)}
				</span>
				<span className="text-xs text-muted-foreground text-pretty">{t(copy.textKey)}</span>
			</div>
			<Switch
				checked={isOn}
				onChange={(next: boolean) => onToggle(settingKey, next)}
				disabled={isSaving}
				aria-labelledby={titleId}
				className={SWITCH_TRACK_RECIPE}
			>
				<span aria-hidden="true" className={SWITCH_THUMB_RECIPE} />
			</Switch>
		</div>
	);
}

/**
 * The notification types Gauzy files for this employee, one switch each. A switch saves at once and comes back
 * if Gauzy refuses the change.
 */
export const NotificationSettings = () => {
	const t = useTranslations();
	const { setting, isAvailable, isLoading, isError, retry, toggle, pendingKey } = useNotificationSettings();
	const isSettled = !isLoading && !isError;
	const showsRows = isAvailable && isSettled;

	const handleToggle = (key: TEmployeeNotificationSettingKey, isOn: boolean) => {
		toggle({ key, isOn }).catch(() => toast.error(t('notifications.SETTINGS_PAGE.SAVE_FAILED')));
	};

	return (
		<div className="flex flex-col gap-4">
			<NotificationSettingsIntro />
			{isLoading && <SettingsRowsSkeleton />}
			{isError && (
				<div role="alert" className="flex items-center gap-3 text-sm text-muted-foreground">
					<span>{t('notifications.SETTINGS_PAGE.LOAD_ERROR')}</span>
					<Button type="button" variant="outline" size="sm" onClick={() => retry()}>
						{t('notifications.RETRY')}
					</Button>
				</div>
			)}
			{showsRows && (
				<div className={LIST_SURFACE_CLASS}>
					{NOTIFICATION_SETTING_KEYS.map((key) => (
						<SettingRow
							key={key}
							settingKey={key}
							setting={setting}
							isSaving={pendingKey === key}
							onToggle={handleToggle}
						/>
					))}
				</div>
			)}
		</div>
	);
};
