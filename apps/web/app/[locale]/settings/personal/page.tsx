'use client';

import { withAuthentication } from 'lib/app/authenticator';
import { Breadcrumb, Container } from 'lib/components';
import { MainLayout } from 'lib/layout';
import { DangerZone, LeftSideSettingMenu, PersonalSettingForm, ProfileAvatar } from 'lib/settings';

import { userState } from '@app/stores';
import SettingsPersonalSkeleton from '@components/shared/skeleton/SettingsPersonalSkeleton';
import { Accordian } from 'lib/components/accordian';
import { ArrowLeft } from 'lib/components/svgs';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useRecoilState, useRecoilValue } from 'recoil';
import { AppProps } from 'next/app';
import { MyAppProps } from '@app/interfaces/AppProps';
import { JitsuRoot } from 'lib/settings/JitsuRoot';
import { fullWidthState } from '@app/stores/fullWidth';

const Personal = ({ pageProps }: AppProps<MyAppProps>) => {
	const t = useTranslations();
	const [user] = useRecoilState(userState);
	const breadcrumb = [...JSON.parse(t('pages.settings.BREADCRUMB'))];
	const fullWidth = useRecoilValue(fullWidthState);

	return (
		<>
			<JitsuRoot pageProps={pageProps}>
				{!user ? (
					<SettingsPersonalSkeleton />
				) : (
					<MainLayout className="items-start pb-1">
						<div className="pt-12 pb-4 bg-white dark:bg-dark--theme">
							<Container fullWidth={fullWidth}>
								<div className="flex items-center gap-8">
									<Link href="/">
										<ArrowLeft className="w-6 h-6" />
									</Link>

									<Breadcrumb paths={breadcrumb} className="text-sm" />
								</div>
							</Container>
						</div>

						<Container fullWidth={fullWidth} className="mb-10">
							<div className="flex flex-col w-full sm:flex-row">
								<LeftSideSettingMenu />
								<div className="flex flex-col w-full mr-[20px] lg:mr-0">
									<Link href={'/settings/team'} className="w-full">
										<button className="w-full lg:hidden hover:bg-white rounded-xl border border-dark text-dark p-4 mt-2">
											Go to Team settings
										</button>
									</Link>
									<Accordian
										title={t('pages.settingsPersonal.HEADING_TITLE')}
										className=" max-w-[96vw] overflow-y-hidden p-4 mt-8 dark:bg-dark--theme"
										id="general"
									>
										{/* <Text className="text-base font-normal text-center text-gray-400 sm:text-left">
										{t('pages.settings.HEADING_DESCRIPTION')}
									</Text> */}
										<ProfileAvatar />
										<PersonalSettingForm />
									</Accordian>
									<Accordian
										title={t('pages.settings.DANDER_ZONE')}
										className="p-4 mt-4 dark:bg-dark--theme"
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
									<Text className="mb-2 text-4xl font-medium">
										{t('pages.settingsPersonal.HEADING_TITLE')}
									</Text>
									<Text className="text-base font-normal text-center text-gray-400 sm:text-left">
										{t('pages.settings.HEADING_DESCRIPTION')}
									</Text>
									<ProfileAvatar />
									<PersonalSettingForm />
								</Card>
								<Card
									className="dark:bg-dark--theme p-[32px] mt-4"
									shadow="bigger"
								>
									<Text className="text-2xl text-[#EB6961] font-normal text-center sm:text-left">
										{t('pages.settings.DANDER_ZONE')}
									</Text>
									<DangerZone />
								</Card> */}
								</div>
							</div>
						</Container>
					</MainLayout>
				)}
			</JitsuRoot>
		</>
	);
};
export default withAuthentication(Personal, { displayName: 'Personal' });
