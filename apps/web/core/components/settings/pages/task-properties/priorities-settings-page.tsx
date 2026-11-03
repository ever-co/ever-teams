'use client';

import { useTranslations } from 'next-intl';
import { TeamSettingsGate } from '@/core/components/settings/kit/team-settings-gate';
import { usePrioritySettings } from '@/core/hooks/settings/use-priority-settings';
import { PrioritiesSettingsSkeleton, PRIORITIES_SKELETON_ROWS } from './priorities-settings-skeleton';
import { TaskPropertySettingsBody } from './task-property-settings-body';

function PrioritiesSettingsContent() {
	const t = useTranslations();
	const model = usePrioritySettings();
	return (
		<TaskPropertySettingsBody
			kind="priority"
			title={t('settings.entries.priorities.TITLE')}
			description={t('settings.entries.priorities.DESCRIPTION')}
			model={model}
			skeletonRows={PRIORITIES_SKELETON_ROWS}
		/>
	);
}

export function PrioritiesSettingsPage() {
	return (
		<TeamSettingsGate skeleton={<PrioritiesSettingsSkeleton />}>
			<PrioritiesSettingsContent />
		</TeamSettingsGate>
	);
}
