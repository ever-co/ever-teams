'use client';

import { withAuthentication } from 'lib/app/authenticator';
import { DangerZone, PersonalSettingForm, ProfileAvatar } from 'lib/settings';
import { Accordian } from 'lib/components/accordian';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { SyncZone } from 'lib/settings/sync.zone';

const Personal = () => {
	const t = useTranslations();

	return (
		<>
			<Link href={'/settings/team'} className="w-full">
				<button className="w-full lg:hidden hover:bg-white rounded-xl border border-dark text-dark p-4 mt-2">
					Go to Team settings
				</button>
			</Link>
			<Accordian
				title={t('pages.settingsPersonal.HEADING_TITLE')}
				className="w-full max-w-[96vw] overflow-y-hidden p-4 mt-8 dark:bg-dark--theme"
				id="general"
			>
				{/* <Text className="text-base font-normal text-center text-gray-400 sm:text-left">
					{t('pages.settings.HEADING_DESCRIPTION')}
				</Text> */}
				<ProfileAvatar />
				<PersonalSettingForm />
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
				isDanger={true}
				id="danger-zone"
			>
				<DangerZone />
			</Accordian>
		</>
	);
};
export default withAuthentication(Personal, { displayName: 'Personal' });
