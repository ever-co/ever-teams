'use client';

import { useTranslations } from 'next-intl';
import { cn } from '@/core/lib/helpers';
import { SETTINGS_SKELETON_BAR, SETTINGS_SURFACE, SettingsPage } from '@/core/components/settings/kit/settings-page';

function PersonRowSkeleton({ nameWidth, trailingWidth }: Readonly<{ nameWidth: string; trailingWidth: string }>) {
	return (
		<div className="flex min-h-14 items-center gap-3 px-4 py-2.5" aria-hidden="true">
			<span className="size-8 shrink-0 rounded-full bg-foreground/[0.07]" />
			<div className="flex min-w-0 flex-1 flex-col gap-2">
				<span className={cn(SETTINGS_SKELETON_BAR, 'h-2.5', nameWidth)} />
				<span className={cn(SETTINGS_SKELETON_BAR, 'h-2 w-40')} />
			</div>
			<span className={cn(SETTINGS_SKELETON_BAR, 'h-2.5', trailingWidth)} />
		</div>
	);
}

const NAME_WIDTHS = ['w-28', 'w-36', 'w-24', 'w-32', 'w-28'];

export function PeopleRowsSkeleton({
	rows,
	trailingWidth = 'w-14'
}: Readonly<{ rows: number; trailingWidth?: string }>) {
	const rowKeys = Array.from({ length: rows }, (_, index) => index);
	return (
		<div className={SETTINGS_SURFACE} aria-busy="true">
			{rowKeys.map((key) => (
				<PersonRowSkeleton
					key={key}
					nameWidth={NAME_WIDTHS[key % NAME_WIDTHS.length]}
					trailingWidth={trailingWidth}
				/>
			))}
		</div>
	);
}

function PeopleSectionSkeleton({
	title,
	rows,
	trailingWidth
}: Readonly<{ title: string; rows: number; trailingWidth?: string }>) {
	return (
		<section className="flex flex-col gap-3">
			<div className="min-w-0">
				<h2 className="text-[15px] font-semibold text-foreground">{title}</h2>
				<span aria-hidden="true" className={cn(SETTINGS_SKELETON_BAR, 'mt-2 block h-2.5 w-48')} />
			</div>
			<PeopleRowsSkeleton rows={rows} trailingWidth={trailingWidth} />
		</section>
	);
}

export function MembersSettingsSkeleton() {
	const t = useTranslations();
	return (
		<SettingsPage
			title={t('settings.entries.members.TITLE')}
			description={t('settings.entries.members.DESCRIPTION')}
			actions={<span aria-hidden="true" className="h-8 w-20 rounded-full bg-primary/15" />}
		>
			<PeopleSectionSkeleton title={t('settings.members.MEMBERS_SECTION')} rows={5} />
			<PeopleSectionSkeleton title={t('settings.members.INVITATIONS_SECTION')} rows={2} trailingWidth="w-16" />
			<PeopleSectionSkeleton title={t('settings.members.REQUESTS_SECTION')} rows={2} trailingWidth="w-24" />
		</SettingsPage>
	);
}
