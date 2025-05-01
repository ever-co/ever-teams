'use client';

import { withAuthentication } from '@/core/components/layouts/app/authenticator';
import { DangerZone, PersonalSettingForm, ProfileAvatar } from '@/core/components/settings';
import { Accordian } from '@/core/components/accordian';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { SyncZone } from '@/core/components/settings/sync.zone';
import { WorkingHours } from '@/core/components/settings/working-hours';

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
				<ProfileAvatar />
				<PersonalSettingForm />
			</Accordian>
			<Accordian title="Working hours" className="p-4 mt-4 dark:bg-dark--theme" id="working-hours">
				<WorkingHours />
			</Accordian>
			<Accordian
				title={t('pages.settingsPersonal.DATA_SYNCHRONIZATION')}
				className="p-4 mt-4 dark:bg-dark--theme"
				id="sync-zone"
			>
				<SyncZone />
			</Accordian>
			<Accordian
				title={t('pages.settings.DANDER_ZONE')}
				className="p-4 mt-4 dark:bg-dark--theme"
				id="danger-zone"
			>
				<DangerZone />
			</Accordian>
		</div>
	);
};
export default withAuthentication(Personal, { displayName: 'Personal' });
