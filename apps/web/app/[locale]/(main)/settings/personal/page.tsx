'use client';

import { withAuthentication } from '@/core/components/layouts/app/authenticator';
import { Accordian } from '@/core/components/common/accordian';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
const LazyWorkingHours = dynamic(
	() =>
		import('@/core/components/pages/settings/personal/working-hours').then((mod) => ({
			default: mod.WorkingHours
		})),
	{
		ssr: false
		// Note: No loading property for accordion content (Medium article pattern)
	}
);

const LazySyncZone = dynamic(
	() => import('@/core/components/pages/settings/personal/sync.zone').then((mod) => ({ default: mod.SyncZone })),
	{
		ssr: false
		// Note: No loading property for accordion content (Medium article pattern)
	}
);
import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import { AccordionContentSkeleton } from '@/core/components/common/skeleton/accordion-content-skeleton';
import { PersonalSettingFormSkeleton } from '@/core/components/common/skeleton/personal-setting-form-skeleton';
import { WorkingHoursSkeleton } from '@/core/components/common/skeleton/working-hours-skeleton';

// Lazy load heavy components for Settings Personal optimization
const LazyPersonalSettingForm = dynamic(
	() =>
		import('@/core/components/pages/settings/personal/personal-setting-form').then((mod) => ({
			default: mod.PersonalSettingForm
		})),
	{
		ssr: false
		// Note: No loading property for accordion content (Medium article pattern)
	}
);

const LazyDangerZone = dynamic(
	() =>
		import('@/core/components/pages/settings/personal/danger-zone-personal').then((mod) => ({
			default: mod.DangerZone
		})),
	{
		ssr: false
		// Note: No loading property for accordion content (Medium article pattern)
	}
);

const LazyProfileAvatar = dynamic(
	() => import('@/core/components/users/profile-avatar').then((mod) => ({ default: mod.ProfileAvatar })),
	{
		ssr: false,
		loading: () => (
			<div className="flex items-center gap-4 mb-5">
				<div className="w-20 h-20 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-full" />
				<div className="flex flex-col gap-2">
					<div className="w-32 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
					<div className="w-24 h-3 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
				</div>
			</div>
		)
	}
);

const Personal = () => {
	const t = useTranslations();

	return (
		<div className="pb-16 overflow-auto">
			<Link href={'/settings/team'} className="w-full">
				<button className="w-full p-4 mt-2 border lg:hidden hover:bg-white rounded-xl border-dark text-dark">
					Go to Team settings
				</button>
			</Link>
			<Accordian
				title={t('pages.settingsPersonal.HEADING_TITLE')}
				className="w-full max-w-[96vw] p-4 mt-5 dark:bg-dark--theme"
				id="general"
			>
				{/* <Text className="text-base font-normal text-center text-gray-400 sm:text-left">
					{t('pages.settings.HEADING_DESCRIPTION')}
				</Text> */}
				<LazyProfileAvatar />
				<Suspense fallback={<PersonalSettingFormSkeleton />}>
					<LazyPersonalSettingForm />
				</Suspense>
			</Accordian>
			<Accordian title="Working hours" className="p-4 mt-4 dark:bg-dark--theme" id="working-hours">
				<Suspense fallback={<WorkingHoursSkeleton />}>
					<LazyWorkingHours />
				</Suspense>
			</Accordian>
			<Accordian
				title={t('pages.settingsPersonal.DATA_SYNCHRONIZATION')}
				className="p-4 mt-4 dark:bg-dark--theme"
				id="sync-zone"
			>
				<Suspense fallback={<AccordionContentSkeleton type="sync" />}>
					<LazySyncZone />
				</Suspense>
			</Accordian>
			<Accordian
				title={t('pages.settings.DANDER_ZONE')}
				className="p-4 mt-4 dark:bg-dark--theme"
				id="danger-zone"
			>
				<Suspense fallback={<AccordionContentSkeleton type="danger" />}>
					<LazyDangerZone />
				</Suspense>
			</Accordian>
		</div>
	);
};
export default withAuthentication(Personal, { displayName: 'Personal' });
