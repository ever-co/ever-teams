'use client';

import { withAuthentication } from '@/core/components/layouts/app/authenticator';
import { Accordian } from '@/core/components/common/accordian';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { SyncZone } from '@/core/components/pages/settings/personal/sync.zone';
import { WorkingHours } from '@/core/components/pages/settings/personal/working-hours';
import { PersonalSettingForm } from '@/core/components/pages/settings/personal/personal-setting-form';
import { DangerZone } from '@/core/components/pages/settings/personal/danger-zone-personal';
import { ProfileAvatar } from '@/core/components/users/profile-avatar';

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
