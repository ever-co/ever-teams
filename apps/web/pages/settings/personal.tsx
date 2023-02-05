import { withAuthentication } from 'lib/app/authenticator';
import { MainLayout } from 'lib/layout';
import { Breadcrumb, Card, Container, Text } from 'lib/components';
import LeftSideSettingMenu from '@components/pages/settings/left-side-setting-menu';
import ProfileAvatar from '@components/pages/settings/profile-avatar';
import PersonalSettingForm from '@components/pages/settings/personal-setting-form';
import DangerZone from '@components/pages/settings/danger-zone';
import { useTranslation } from 'lib/i18n';

const Personal = () => {
	const { trans, translations } = useTranslation('settingsPersonal');

	return (
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
							<Text className="text-4xl font-medium">
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
	);
};

export default withAuthentication(Personal, { displayName: 'Personal' });
