import { withAuthentication } from 'lib/app/authenticator';
import { MainLayout } from 'lib/layout';
import { Breadcrumb, Card, Container, Text } from 'lib/components';
import {
	LeftSideSettingMenu,
	ProfileAvatar,
	PersonalSettingForm,
	DangerZone,
	// TaskLabelsForm
} from 'lib/settings';

import { useTranslation } from 'lib/i18n';
import SettingsPersonlalSkeleton from '@components/shared/skeleton/SettingsPersonalSkeleton';
import { useRecoilState } from 'recoil';
import { userState } from '@app/stores';


const Personal = () => {
	const { trans, translations } = useTranslation('settingsPersonal');
	const [user] = useRecoilState(userState);

	return (
		<>
			{!user ? (
				<SettingsPersonlalSkeleton />
			) : (
				<MainLayout>
					<div className="bg-white dark:bg-dark--theme pt-16 -mt-8 pb-4">
						<Container>
							<Breadcrumb
								paths={translations.pages.settings.BREADCRUMB}
								className="text-sm"
							/>
						</Container>
					</div>

					<Container className="mb-10">
						<div className="flex w-full">
							<LeftSideSettingMenu />
							<div className="flex flex-col w-full">
								<Card
									className="dark:bg-dark--theme p-[32px] mt-[36px]"
									shadow="bigger"
								>
									<Text className="text-4xl font-medium mb-2">
										{trans.HEADING_TITLE}
									</Text>
									<Text className="text-base font-normal text-gray-400">
										{translations.pages.settings.HEADING_DESCRIPTION}
									</Text>
									<ProfileAvatar />
									<PersonalSettingForm />
								</Card>
								<Card
									className="dark:bg-dark--theme p-[32px] mt-[36px]"
									shadow="bigger"
								>
									<Text className="text-2xl text-[#EB6961] font-normal">
										{translations.pages.settings.DANDER_ZONE}
									</Text>
									<DangerZone />
								</Card>
							</div>
						</div>
					</Container>
				</MainLayout>
			)}
		</>
	);
};

export default withAuthentication(Personal, { displayName: 'Personal' });
