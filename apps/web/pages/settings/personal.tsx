import { withAuthentication } from 'lib/app/authenticator';
import { MainLayout } from 'lib/layout';
import { Breadcrumb, Container } from 'lib/components';
import {
	LeftSideSettingMenu,
	ProfileAvatar,
	PersonalSettingForm,
	DangerZone,
	// TaskLabelsForm
} from 'lib/settings';

import { useTranslation } from 'lib/i18n';
import SettingsPersonalSkeleton from '@components/shared/skeleton/SettingsPersonalSkeleton';
import { useRecoilState } from 'recoil';
import { userState } from '@app/stores';
import Link from 'next/link';
import { ArrowLeft } from 'lib/components/svgs';
import { Accordian } from 'lib/components/accordian';

const Personal = () => {
	const { trans, translations } = useTranslation('settingsPersonal');
	const [user] = useRecoilState(userState);

	return (
		<>
			{!user ? (
				<SettingsPersonalSkeleton />
			) : (
				<MainLayout className="items-start pb-1">
					<div className="bg-white dark:bg-dark--theme pt-12 pb-4">
						<Container>
							<div className="flex items-center gap-8">
								<Link href="/">
									<ArrowLeft className="w-6 h-6" />
								</Link>

								<Breadcrumb
									paths={translations.pages.settings.BREADCRUMB}
									className="text-sm"
								/>
							</div>
						</Container>
					</div>

					<Container className="mb-10">
						<div className="flex w-full sm:flex-row flex-col">
							<LeftSideSettingMenu />
							<div className="flex flex-col w-full mr-[20px] lg:mr-0">
								<Accordian
									title={trans.HEADING_TITLE}
									className="dark:bg-dark--theme p-4 mt-8"
									id="general"
								>
									{/* <Text className="text-base font-normal text-gray-400 text-center sm:text-left">
										{translations.pages.settings.HEADING_DESCRIPTION}
									</Text> */}
									<ProfileAvatar />
									<PersonalSettingForm />
								</Accordian>
								<Accordian
									title={translations.pages.settings.DANDER_ZONE}
									className="dark:bg-dark--theme p-4 mt-4"
									isDanger={true}
									id="danger-zone"
								>
									<DangerZone />
								</Accordian>
								{/*
								<Card
									className="dark:bg-dark--theme p-[32px] mt-4"
									shadow="bigger"
								>
									<Text className="text-4xl font-medium mb-2">
										{trans.HEADING_TITLE}
									</Text>
									<Text className="text-base font-normal text-gray-400 text-center sm:text-left">
										{translations.pages.settings.HEADING_DESCRIPTION}
									</Text>
									<ProfileAvatar />
									<PersonalSettingForm />
								</Card>
								<Card
									className="dark:bg-dark--theme p-[32px] mt-4"
									shadow="bigger"
								>
									<Text className="text-2xl text-[#EB6961] font-normal text-center sm:text-left">
										{translations.pages.settings.DANDER_ZONE}
									</Text>
									<DangerZone />
								</Card> */}
							</div>
						</div>
					</Container>
				</MainLayout>
			)}
		</>
	);
};

export default withAuthentication(Personal, { displayName: 'Personal' });
