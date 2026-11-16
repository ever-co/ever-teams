'use client';

import { useTranslations } from 'next-intl';
import { NotificationTypeBadge } from '@/core/components/notifications/notification-type-badge';
import { SettingsRow, SettingsSection, SettingsSurface } from '@/core/components/settings/kit/settings-page';
import { ownEmailModeOf } from '@/core/lib/notifications/notification-preferences';
import {
	EEmployeeNotificationType,
	type INotificationPreferences
} from '@/core/types/interfaces/common/employee-notification';
import { EmailModeChoice, EmailModeSelect } from './notification-channel-rows';

/**
 * The two kinds the Boards app raises (#5022), as the settings page lists them: always in the Inbox, with no switch of
 * their own on the platform, so each row offers what the reader can choose, the email mode (and, in the browser
 * notifications section, the push switch).
 */
export const BOARD_NOTIFICATION_KINDS = [
	{
		type: EEmployeeNotificationType.BoardShare,
		id: 'notification-board-share',
		labelKey: 'notifications.SETTINGS_PAGE.BOARDS.SHARE_LABEL'
	},
	{
		type: EEmployeeNotificationType.BoardMention,
		id: 'notification-board-mention',
		labelKey: 'notifications.SETTINGS_PAGE.BOARDS.MENTION_LABEL'
	}
] as const;

type BoardNotificationsSectionProps = {
	preferences: INotificationPreferences | null | undefined;
	disabled: boolean;
	onEmailMode: (type: EEmployeeNotificationType, mode: EmailModeChoice) => void;
};

/** A Board shared with the reader, or a mention of them in one: how each reaches them by email. */
export function BoardNotificationsSection({
	preferences,
	disabled,
	onEmailMode
}: Readonly<BoardNotificationsSectionProps>) {
	const t = useTranslations();
	return (
		<SettingsSection
			id="notification-boards"
			title={t('notifications.SETTINGS_PAGE.BOARDS.TITLE')}
			description={t('notifications.SETTINGS_PAGE.BOARDS.INTRO')}
		>
			<SettingsSurface>
				{BOARD_NOTIFICATION_KINDS.map((kind) => (
					<SettingsRow
						key={kind.type}
						label={t(kind.labelKey)}
						description={t('notifications.SETTINGS_PAGE.BOARDS.TEXT')}
						leading={<NotificationTypeBadge type={kind.type} size="md" />}
						htmlFor={kind.id}
						controlClassName="flex-wrap"
					>
						<EmailModeSelect
							id={kind.id}
							value={ownEmailModeOf(preferences, kind.type) ?? 'default'}
							allowDefault
							disabled={disabled}
							ariaLabel={`${t('notifications.SETTINGS_PAGE.CHANNELS.MODE_LABEL')}: ${t(kind.labelKey)}`}
							className="w-full sm:w-40"
							onChange={(mode) => onEmailMode(kind.type, mode)}
						/>
					</SettingsRow>
				))}
			</SettingsSurface>
		</SettingsSection>
	);
}
