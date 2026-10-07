'use client';

import { withAuthentication } from '@/core/components/layouts/app/authenticator';
import { Accordian } from '@/core/components/common/accordian';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { InteractionObserverVisible } from '@/core/components/pages/settings/interaction-observer';
import { useSetAtom } from 'jotai';
import { activeSettingPersonalTab } from '@/core/stores/common/setting';
// Import optimized components from centralized location
import {
	LazyWorkingHours,
	LazySyncZone,
	LazyPersonalSettingForm,
	LazyDangerZone,
	LazyProfileAvatar
} from '@/core/components/optimized-components/settings';
import { Suspense } from 'react';
import { AccordionContentSkeleton } from '@/core/components/common/skeleton/accordion-content-skeleton';
import { PersonalSettingFormSkeleton } from '@/core/components/common/skeleton/personal-setting-form-skeleton';
import { WorkingHoursSkeleton } from '@/core/components/common/skeleton/working-hours-skeleton';

const Personal = () => {
	const t = useTranslations();
	const setActivePersonalTab = useSetAtom(activeSettingPersonalTab);
	return (
		<div className="space-y-4 pb-8">
			<Link href={'/settings/team'} className="w-full">
				<button className="h-10 px-4 w-full rounded-lg border lg:hidden hover:bg-muted">
					{t('pages.settingsPersonal.goToTeamSettings')}
				</button>
			</Link>
			<InteractionObserverVisible id="general" setActiveSection={setActivePersonalTab}>
				<Accordian title={t('pages.settingsPersonal.HEADING_TITLE')} className="w-full" id="general">
					{/* <Text className="text-base font-normal text-center text-gray-400 sm:text-left">
					{t('pages.settings.HEADING_DESCRIPTION')}
				</Text> */}
					<LazyProfileAvatar />
					<Suspense fallback={<PersonalSettingFormSkeleton />}>
						<LazyPersonalSettingForm />
					</Suspense>
				</Accordian>
			</InteractionObserverVisible>

			<InteractionObserverVisible id="working-hours" setActiveSection={setActivePersonalTab}>
				<Accordian title={t('pages.settingsPersonal.WORKING_HOURS')} className="w-full" id="working-hours">
					<Suspense fallback={<WorkingHoursSkeleton />}>
						<LazyWorkingHours />
					</Suspense>
				</Accordian>
			</InteractionObserverVisible>
			<InteractionObserverVisible id="sync-zone" setActiveSection={setActivePersonalTab}>
				<Accordian title={t('pages.settingsPersonal.DATA_SYNCHRONIZATION')} className="w-full" id="sync-zone">
					<Suspense fallback={<AccordionContentSkeleton type="sync" />}>
						<LazySyncZone />
					</Suspense>
				</Accordian>
			</InteractionObserverVisible>
			<InteractionObserverVisible id="danger-zone" setActiveSection={setActivePersonalTab}>
				<Accordian title={t('pages.settings.DANDER_ZONE')} className="w-full" id="danger-zone">
					<Suspense fallback={<AccordionContentSkeleton type="danger" />}>
						<LazyDangerZone />
					</Suspense>
				</Accordian>
			</InteractionObserverVisible>
		</div>
	);
};
export default withAuthentication(Personal, {
	displayName: 'Personal',
	showPageSkeleton: true
});
