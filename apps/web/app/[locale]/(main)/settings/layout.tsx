'use client';
import { userState } from '@/core/stores';
import { fullWidthState } from '@/core/stores/fullWidth';
import SettingsPersonalSkeleton from '@/core/components/common/skeleton/settings-personal-skeleton';
import { Container } from '@/core/components';
import { ArrowLeftIcon } from 'assets/svg';
import { MainLayout } from '@/core/components/layouts/default-layout';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useAtom, useAtomValue } from 'jotai';
import { withAuthentication } from '@/core/components/layouts/app/authenticator';
import { usePathname } from 'next/navigation';
import { useOrganizationTeams } from '@/core/hooks';
import { cn } from '@/core/lib/helpers';
import { ReactNode } from 'react';
import { LeftSideSettingMenu } from '@/core/components/pages/settings/left-side-setting-menu';
import { Breadcrumb } from '@/core/components/duplicated-components/breadcrumb';

const SettingsLayout = ({ children }: { children: ReactNode }) => {
	const { isTrackingEnabled } = useOrganizationTeams();
	const t = useTranslations();
	const [user] = useAtom(userState);
	const fullWidth = useAtomValue(fullWidthState);
	const pathName = usePathname();
	const getEndPath: any = pathName?.split('settings/')[1];
	const endWord: 'TEAM' | 'PERSONAL' = getEndPath?.toUpperCase();
	const breadcrumb = [
		{ title: JSON.parse(t('pages.home.BREADCRUMB')), href: '/' },
		{ title: t('common.SETTINGS'), href: pathName as string },
		{ title: t(`common.${endWord}`), href: pathName as string }
	];

	if (!user) {
		return <SettingsPersonalSkeleton />;
	} else {
		return (
			<MainLayout
				showTimer={isTrackingEnabled}
				className="items-start w-full pb-1 overflow-hidden"
				childrenClassName="h-[calc(100vh-_300px)] overflow-hidden w-full !min-h-fit"
				mainHeaderSlot={
					<div className="w-full py-6 bg-white dark:bg-dark--theme">
						<Container
							fullWidth={fullWidth}
							className={cn('w-full flex flex-row items-center justify-start gap-8')}
						>
							<Link href="/">
								<ArrowLeftIcon className="w-6 h-6" />
							</Link>

							<Breadcrumb paths={breadcrumb} className="text-sm" />
						</Container>
					</div>
				}
			>
				<Container fullWidth={fullWidth} className={cn('!p-0 w-full')}>
					<div className="flex w-full">
						<LeftSideSettingMenu />
						<div className="h-[calc(100svh-_291px)] mt-3 px-5 overflow-y-auto w-full">{children}</div>
					</div>
				</Container>
			</MainLayout>
		);
	}
};

export default withAuthentication(SettingsLayout, { displayName: 'Settings' });
