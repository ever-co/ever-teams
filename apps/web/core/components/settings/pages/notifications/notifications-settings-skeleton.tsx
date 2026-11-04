'use client';

import { useTranslations } from 'next-intl';
import {
	SETTINGS_ROW,
	SETTINGS_SKELETON_BAR,
	SettingsPageSkeleton,
	SettingsSection,
	SettingsSurface
} from '@/core/components/settings/kit/settings-page';
import { cn } from '@/core/lib/helpers';

const ROW_KEYS = [0, 1, 2];

const LABEL_WIDTHS = ['w-24', 'w-20', 'w-28'];

function NotificationRowSkeleton({ index }: Readonly<{ index: number }>) {
	return (
		<div className={SETTINGS_ROW} aria-hidden="true">
			<div className="flex min-w-0 flex-1 items-start gap-3">
				<span className="mt-0.5 size-6 shrink-0 rounded-full bg-foreground/[0.07]" />
				<div className="flex min-w-0 flex-1 flex-col gap-2 py-0.5">
					<span className={cn(SETTINGS_SKELETON_BAR, 'h-2.5', LABEL_WIDTHS[index])} />
					<span className={cn(SETTINGS_SKELETON_BAR, 'h-2 w-3/5')} />
				</div>
			</div>
			<span className="h-6 w-10.5 shrink-0 rounded-full bg-foreground/[0.07]" />
		</div>
	);
}

export function NotificationGroupsSkeleton() {
	const t = useTranslations();
	return (
		<>
			<SettingsSection
				title={t('settings.notifications.GROUP_WORK')}
				description={t('notifications.SETTINGS_PAGE.INTRO')}
			>
				<SettingsSurface>
					{ROW_KEYS.map((key) => (
						<NotificationRowSkeleton key={key} index={key} />
					))}
				</SettingsSurface>
			</SettingsSection>
			<SettingsSection title={t('settings.notifications.GROUP_PEOPLE')}>
				<SettingsSurface>
					{ROW_KEYS.map((key) => (
						<NotificationRowSkeleton key={key} index={key} />
					))}
				</SettingsSurface>
			</SettingsSection>
		</>
	);
}

export function NotificationsSettingsSkeleton() {
	const t = useTranslations();
	return (
		<SettingsPageSkeleton
			title={t('settings.entries.notifications.TITLE')}
			description={t('settings.entries.notifications.DESCRIPTION')}
		>
			<NotificationGroupsSkeleton />
		</SettingsPageSkeleton>
	);
}
