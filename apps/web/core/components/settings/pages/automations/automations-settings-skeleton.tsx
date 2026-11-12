'use client';

import { useTranslations } from 'next-intl';
import { cn } from '@/core/lib/helpers';
import { SETTINGS_SKELETON_BAR, SettingsPageSkeleton, SettingsSurface } from '@/core/components/settings/kit/settings-page';

function RowsSkeleton() {
	return (
		<SettingsSurface>
			{[0, 1, 2].map((row) => (
				<div key={row} className="flex min-h-16 items-center gap-4 px-4 py-3" aria-busy="true">
					<div className="flex min-w-0 flex-1 flex-col gap-1.5">
						<span aria-hidden="true" className={cn(SETTINGS_SKELETON_BAR, 'h-2.5 w-2/5')} />
						<span aria-hidden="true" className={cn(SETTINGS_SKELETON_BAR, 'h-2 w-3/5')} />
					</div>
					<span aria-hidden="true" className="h-5 w-9 shrink-0 rounded-full bg-foreground/[0.07]" />
				</div>
			))}
		</SettingsSurface>
	);
}

/** Settings → Automations while the platform's answer or the rules are on their way. */
export function AutomationsSettingsSkeleton({ rowsOnly = false }: Readonly<{ rowsOnly?: boolean }>) {
	const t = useTranslations();
	if (rowsOnly) return <RowsSkeleton />;
	return (
		<SettingsPageSkeleton title={t('settings.entries.automations.TITLE')} description={t('settings.entries.automations.DESCRIPTION')}>
			<RowsSkeleton />
		</SettingsPageSkeleton>
	);
}
