'use client';

import Link from 'next/link';
import { useAtomValue } from 'jotai';
import { useTranslations } from 'next-intl';
import { ChevronRight } from '@/core/components/icons';
import { isTeamManagerState } from '@/core/stores';
import { entriesOfGroup, SETTINGS_GROUPS, SettingsEntry } from '@/core/components/settings/kit/settings-entries';
import { SETTINGS_SURFACE, SettingsPage, SettingsSection } from '@/core/components/settings/kit/settings-page';

function IndexRow({ entry }: Readonly<{ entry: SettingsEntry }>) {
	const t = useTranslations();
	return (
		<Link
			href={entry.href}
			className="flex min-h-14 items-center gap-3 px-4 py-3 outline-none transition-colors hover:bg-foreground/[0.025] focus-visible:bg-foreground/[0.04]"
		>
			<span className="flex size-8 shrink-0 items-center justify-center rounded-lg keycap-3d text-foreground/70">
				<entry.icon className="size-4" />
			</span>
			<span className="flex min-w-0 flex-1 flex-col gap-0.5">
				<span className="text-[13px] font-medium text-foreground">
					{t(`settings.entries.${entry.id}.TITLE`)}
				</span>
				<span className="truncate text-xs text-muted-foreground">
					{t(`settings.entries.${entry.id}.DESCRIPTION`)}
				</span>
			</span>
			<ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
		</Link>
	);
}

export function SettingsIndexPage() {
	const t = useTranslations();
	const isTeamManager = useAtomValue(isTeamManagerState);

	return (
		<SettingsPage title={t('common.SETTINGS')} description={t('settings.index.DESCRIPTION')}>
			{SETTINGS_GROUPS.map((group) => (
				<SettingsSection key={group} title={t(`settings.groups.${group}`)}>
					<nav aria-label={t(`settings.groups.${group}`)} className={SETTINGS_SURFACE}>
						{entriesOfGroup(group, isTeamManager).map((entry) => (
							<IndexRow key={entry.id} entry={entry} />
						))}
					</nav>
				</SettingsSection>
			))}
		</SettingsPage>
	);
}
